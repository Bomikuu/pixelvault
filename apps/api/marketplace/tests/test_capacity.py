import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from config.errors import DomainError
from django.db import close_old_connections
from django.utils import timezone

from marketplace.applications import apply_to_offer
from marketplace.models import LendingOffer
from marketplace.reservations import expire_reservations, select_application

pytestmark = pytest.mark.django_db(transaction=True)


def test_two_selections_cannot_exceed_capacity(offer, members):
    applications = [
        apply_to_offer(
            borrower_id=member.id, offer_id=offer.id, principal=1000000, operation_id=uuid.uuid4()
        )
        for member in members[1:]
    ]
    barrier = Barrier(2)

    def select(application):
        close_old_connections()
        barrier.wait(timeout=10)
        try:
            select_application(
                lender_id=members[0].id,
                application_id=application.id,
                expected_offer_version=1,
                operation_id=uuid.uuid4(),
                at=timezone.now(),
            )
            return "selected"
        except DomainError as error:
            return error.detail["code"]
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(select, applications))
    offer.refresh_from_db()
    assert results.count("selected") == 1
    assert offer.reserved_amount + offer.committed_amount == 1000000


def test_expiry_releases_capacity(application, members):
    from datetime import timedelta

    at = timezone.now()
    reservation = select_application(
        lender_id=members[0].id,
        application_id=application.id,
        expected_offer_version=1,
        operation_id=uuid.uuid4(),
        at=at,
    )
    assert expire_reservations(at=at + timedelta(hours=25)) == 1
    assert expire_reservations(at=at + timedelta(hours=26)) == 0
    offer = LendingOffer.objects.get(pk=reservation.offer_id)
    assert offer.reserved_amount == 0


def test_selection_expiry_commit_race_has_one_winner(application, members):
    from datetime import timedelta

    from agreements.acceptance import accept_agreement
    from servicing.models import Loan

    at = timezone.now()
    reservation = select_application(
        lender_id=members[0].id,
        application_id=application.id,
        expected_offer_version=1,
        operation_id=uuid.uuid4(),
        at=at,
    )
    agreement = reservation.agreements.get()
    accept_agreement(
        member_id=members[0].id,
        agreement_id=agreement.id,
        expected_hash=agreement.hash,
        operation_id=uuid.uuid4(),
        at=at,
    )
    barrier = Barrier(2)

    def commit():
        close_old_connections()
        barrier.wait(timeout=10)
        try:
            accept_agreement(
                member_id=members[1].id,
                agreement_id=agreement.id,
                expected_hash=agreement.hash,
                operation_id=uuid.uuid4(),
                at=at + timedelta(hours=23),
            )
            return "committed"
        except DomainError:
            return "expired"
        finally:
            close_old_connections()

    def expire():
        close_old_connections()
        barrier.wait(timeout=10)
        try:
            return expire_reservations(at=at + timedelta(hours=25))
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        signing, expiry = executor.submit(commit), executor.submit(expire)
        _, expired = signing.result(), expiry.result()
    reservation.refresh_from_db()
    offer = LendingOffer.objects.get(pk=reservation.offer_id)
    assert (reservation.status, Loan.objects.count(), expired) in {
        ("committed", 1, 0),
        ("expired", 0, 1),
    }
    assert offer.reserved_amount == 0
    assert offer.committed_amount in {0, 1000000}
