# ruff: noqa: F401, F811
import uuid
from datetime import timedelta

import pytest
from config.errors import DomainError
from django.utils import timezone
from marketplace.tests.conftest import application, eligible, members, offer, terms
from servicing.models import LedgerEntry, Loan
from servicing.tests.conftest import loan
from servicing.transfers import request_disbursement

from agreements.acceptance import accept_agreement
from agreements.renewal import renew_effective_date

pytestmark = pytest.mark.django_db


def test_renewal_preserves_old_agreement_and_requires_both_again(loan, members):
    original_hash = loan.agreement.hash
    original_terms = dict(loan.agreement.terms)
    effective = timezone.localdate() + timedelta(days=1)
    key = uuid.uuid4()
    replacement = renew_effective_date(
        loan_id=loan.id, actor_id=members[0].id, effective_date=effective, operation_id=key
    )
    assert (
        renew_effective_date(
            loan_id=loan.id, actor_id=members[0].id, effective_date=effective, operation_id=key
        ).id
        == replacement.id
    )
    loan.refresh_from_db()
    assert loan.status == "cancelled_before_disbursement"
    assert loan.agreement.hash == original_hash and loan.agreement.terms == original_terms
    assert loan.agreement.acceptances.count() == 2
    assert replacement.hash != original_hash and replacement.acceptances.count() == 0
    assert replacement.terms["effective_date"] == effective.isoformat()
    assert not LedgerEntry.objects.exists()
    first = accept_agreement(
        member_id=members[0].id,
        agreement_id=replacement.id,
        expected_hash=replacement.hash,
        operation_id=uuid.uuid4(),
    )
    assert first.loan_id is None
    second = accept_agreement(
        member_id=members[1].id,
        agreement_id=replacement.id,
        expected_hash=replacement.hash,
        operation_id=uuid.uuid4(),
    )
    assert Loan.objects.get(pk=second.loan_id).status == "awaiting_disbursement"
    assert Loan.objects.count() == 2
    replacement.reservation.offer.refresh_from_db()
    assert replacement.reservation.offer.committed_amount == 1000000
    assert replacement.reservation.offer.reserved_amount == 0


def test_uncertain_transfer_blocks_date_renewal(loan, members):
    class Timeout:
        def dispatch(self, transfer):
            raise TimeoutError()

    request_disbursement(
        loan_id=loan.id, actor_id=members[0].id, operation_id=uuid.uuid4(), adapter=Timeout()
    )
    with pytest.raises(DomainError) as error:
        renew_effective_date(
            loan_id=loan.id,
            actor_id=members[0].id,
            effective_date=timezone.localdate(),
            operation_id=uuid.uuid4(),
        )
    assert error.value.detail["code"] == "transfer_reconciliation_required"
    loan.refresh_from_db()
    assert loan.status == "awaiting_disbursement" and loan.disbursement_status == "uncertain"


def test_borrower_cannot_unilaterally_renew(loan, members):
    with pytest.raises(DomainError) as error:
        renew_effective_date(
            loan_id=loan.id,
            actor_id=members[1].id,
            effective_date=timezone.localdate(),
            operation_id=uuid.uuid4(),
        )
    assert error.value.status_code == 404
