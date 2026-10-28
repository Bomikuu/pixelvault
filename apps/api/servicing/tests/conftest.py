# ruff: noqa: F401, F811
import uuid

import pytest
from agreements.acceptance import accept_agreement
from django.utils import timezone
from marketplace.reservations import select_application
from marketplace.tests.conftest import application, eligible, members, offer, terms

from servicing.models import Loan
from servicing.transfers import request_disbursement


@pytest.fixture
def loan(application, members):
    reservation = select_application(
        lender_id=members[0].id,
        application_id=application.id,
        expected_offer_version=1,
        operation_id=uuid.uuid4(),
        at=timezone.now(),
    )
    agreement = reservation.agreements.get()
    for member in members[:2]:
        result = accept_agreement(
            member_id=member.id,
            agreement_id=agreement.id,
            expected_hash=agreement.hash,
            operation_id=uuid.uuid4(),
            at=timezone.now(),
        )
    return Loan.objects.get(pk=result.loan_id)


@pytest.fixture
def funded(loan, members):
    request_disbursement(loan_id=loan.id, actor_id=members[0].id, operation_id=uuid.uuid4())
    loan.refresh_from_db()
    return loan
