import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest
from config.errors import DomainError
from django.db import close_old_connections
from django.utils import timezone

from servicing.models import Disbursement, LedgerEntry
from servicing.transfers import reconcile_disbursement, request_disbursement

pytestmark = pytest.mark.django_db


def test_one_operation_one_disbursement(loan, members):
    key = uuid.uuid4()
    first = request_disbursement(loan_id=loan.id, actor_id=members[0].id, operation_id=key)
    assert (
        request_disbursement(loan_id=loan.id, actor_id=members[0].id, operation_id=key).transfer_id
        == first.transfer_id
    )
    assert Disbursement.objects.count() == 1
    assert LedgerEntry.objects.filter(kind="principal_disbursed").count() == 1


def test_timeout_is_uncertain_blocks_new_dispatch(loan, members):
    class Timeout:
        def dispatch(self, transfer):
            raise TimeoutError()

    result = request_disbursement(
        loan_id=loan.id, actor_id=members[0].id, operation_id=uuid.uuid4(), adapter=Timeout()
    )
    loan.refresh_from_db()
    assert result.status == "uncertain" and loan.principal_balance == 0
    with pytest.raises(DomainError):
        request_disbursement(loan_id=loan.id, actor_id=members[0].id, operation_id=uuid.uuid4())
    assert reconcile_disbursement(transfer_id=result.transfer_id).status == "confirmed"


def test_late_confirmation_opens_exception(loan, members):
    class Late:
        def dispatch(self, transfer):
            return {
                "status": "confirmed",
                "external_id": "late",
                "effective_at": timezone.now() + timedelta(days=2),
                "amount": transfer.amount,
            }

    result = request_disbursement(
        loan_id=loan.id, actor_id=members[0].id, operation_id=uuid.uuid4(), adapter=Late()
    )
    loan.refresh_from_db()
    assert result.status == "activation_exception"
    assert loan.principal_balance == 0
    assert loan.activation_exception
    assert not LedgerEntry.objects.exists()


def test_principal_created_only_after_confirmation(loan):
    assert loan.principal_balance == 0 and loan.status == "awaiting_disbursement"


@pytest.mark.django_db(transaction=True)
def test_duplicate_disbursement_race(loan, members):
    barrier = Barrier(2)

    def dispatch(_):
        close_old_connections()
        barrier.wait(timeout=10)
        try:
            return request_disbursement(
                loan_id=loan.id, actor_id=members[0].id, operation_id=uuid.uuid4()
            ).status
        except DomainError:
            return "blocked"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(dispatch, range(2)))
    assert results.count("blocked") == 1
    assert Disbursement.objects.count() == 1
    assert LedgerEntry.objects.filter(kind="principal_disbursed").count() == 1
