import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest
from config.errors import DomainError
from django.db import close_old_connections
from django.utils import timezone
from marketplace.reservations import select_application
from rest_framework.test import APIClient
from servicing.models import Loan

from agreements.acceptance import accept_agreement, prepare_agreement
from agreements.models import Acceptance

pytestmark = pytest.mark.django_db


@pytest.fixture
def agreement(application, members):
    reservation = select_application(
        lender_id=members[0].id,
        application_id=application.id,
        expected_offer_version=1,
        operation_id=uuid.uuid4(),
        at=timezone.now(),
    )
    return reservation.agreements.get()


def accept(agreement, member, **overrides):
    return accept_agreement(
        **(
            dict(
                member_id=member.id,
                agreement_id=agreement.id,
                expected_hash=agreement.hash,
                operation_id=uuid.uuid4(),
                at=timezone.now(),
            )
            | overrides
        )
    )


def test_both_named_parties_accept_same_hash(agreement, members):
    first = accept(agreement, members[0])
    assert first.loan_id is None
    second = accept(agreement, members[1])
    loan = Loan.objects.get(pk=second.loan_id)
    assert loan.status == "awaiting_disbursement"
    assert loan.principal_balance == 0
    assert agreement.acceptances.count() == 2
    offer = agreement.reservation.offer
    offer.refresh_from_db()
    assert (offer.reserved_amount, offer.committed_amount) == (0, 1000000)


def test_stale_hash_returns_409(agreement, members):
    with pytest.raises(DomainError) as error:
        accept(agreement, members[0], expected_hash="stale")
    assert error.value.status_code == 409
    assert not Acceptance.objects.exists()


def test_staff_cannot_sign_for_member(agreement, members):
    members[2].is_staff = True
    members[2].save()
    with pytest.raises(DomainError):
        accept(agreement, members[2])


def test_expired_reservation_cannot_commit(agreement, members):
    with pytest.raises(DomainError):
        accept(agreement, members[0], at=timezone.now() + timedelta(days=2))
    assert not Loan.objects.exists()


def test_acceptance_rechecks_eligibility(agreement, members, monkeypatch):
    monkeypatch.setattr(
        "eligibility.services.check_eligibility",
        lambda **kwargs: {"allowed": False, "reasons": ["expired_identity"]},
    )
    with pytest.raises(DomainError):
        accept(agreement, members[0])
    assert not Acceptance.objects.exists()


def test_template_change_creates_new_version(agreement, members):
    next_version = prepare_agreement(
        reservation_id=agreement.reservation_id,
        actor_id=members[0].id,
        template_version="unreviewed-demo-v2",
    )
    agreement.refresh_from_db()
    assert next_version.version == 2 and next_version.hash != agreement.hash
    assert agreement.state == "superseded"


def test_terms_not_overwritten(agreement):
    agreement.terms = {**agreement.terms, "principal": 1}
    with pytest.raises(DomainError):
        agreement.save()


def test_signed_document_private_and_test_label(agreement, members):
    client = APIClient()
    client.force_authenticate(members[2])
    assert client.get(f"/api/v1/agreements/{agreement.id}/document").status_code == 404
    client.force_authenticate(members[1])
    response = client.get(f"/api/v1/agreements/{agreement.id}/document")
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")
    assert response["Content-Type"] == "application/pdf"
    assert response["Cache-Control"] == "private, no-store"


@pytest.mark.django_db(transaction=True)
def test_concurrent_second_acceptance_creates_one_loan(agreement, members):
    accept(agreement, members[0])
    barrier = Barrier(2)

    def sign(_):
        close_old_connections()
        barrier.wait(timeout=10)
        try:
            return accept(agreement, members[1]).loan_id
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(sign, range(2)))
    assert len(set(results)) == 1
    assert Loan.objects.count() == 1


def test_unapproved_policy_blocks_acceptance(agreement, members):
    from eligibility.models import ProductPolicy

    ProductPolicy.objects.filter(version="demo-v1").update(approved=False)
    with pytest.raises(DomainError) as error:
        accept(agreement, members[0])
    assert error.value.detail["code"] == "unapproved_policy"
    assert not Acceptance.objects.exists()


def test_pdf_reproducible_after_profile_name_change(agreement, members):
    from agreements.rendering import render_agreement

    first = render_agreement(agreement_id=agreement.id, actor_id=members[0].id)
    members[0].display_name = "Changed public profile"
    members[0].save()
    second = render_agreement(agreement_id=agreement.id, actor_id=members[0].id)
    assert first == second
    assert agreement.canonical["lender_display_name"] == "Lender"
