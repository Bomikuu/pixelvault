import uuid

import pytest
from django.utils import timezone

from servicing.allocation import record_collection
from servicing.commission import accrue_commission, reverse_commission
from servicing.models import CommissionAccrual

pytestmark = pytest.mark.django_db


def test_commission_accrues_once_at_confirmed_funding(funded):
    commission = accrue_commission(loan_id=funded.id, disbursement_id=funded.disbursement.id)
    assert commission.amount == 20000
    assert CommissionAccrual.objects.count() == 1
    assert commission.status == "pending" and commission.collected_amount == 0
    assert funded.principal_balance == 1000000


def test_unfunded_loan_has_no_commission(loan):
    assert not CommissionAccrual.objects.exists()


def test_repayment_creates_no_fee_or_refund(funded):
    record_collection(
        loan_id=funded.id, amount=100000, effective_at=timezone.now(), source_key="installment"
    )
    assert CommissionAccrual.objects.count() == 1
    assert CommissionAccrual.objects.get().amount == 20000


def test_commission_reversal_is_compensating(funded):
    accrual = funded.commission
    key = uuid.uuid4()
    adjustment = reverse_commission(
        accrual_id=accrual.id, reason="funding reversed", operation_id=key
    )
    assert adjustment.amount == -20000
    assert (
        reverse_commission(accrual_id=accrual.id, reason="funding reversed", operation_id=key).id
        == adjustment.id
    )
    accrual.refresh_from_db()
    assert accrual.amount == 20000 and accrual.status == "reversed"


def test_lender_can_review_fee_borrower_cannot(funded, members):
    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(members[0])
    response = client.get(f"/api/v1/loans/{funded.id}/commission")
    assert response.status_code == 200
    assert response.data["amount"] == 20000
    assert response.data["collected_amount"] == 0
    assert response.data["checkout_path"] == f"/api/v1/commissions/{funded.commission.id}/checkout"
    client.force_authenticate(members[1])
    assert client.get(f"/api/v1/loans/{funded.id}/commission").status_code == 404
