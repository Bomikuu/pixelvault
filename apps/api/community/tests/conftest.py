# ruff: noqa: F401,F811 -- imported pytest fixtures
import uuid

import pytest
from agreements.acceptance import accept_agreement
from marketplace.reservations import select_application
from marketplace.tests.conftest import application, eligible, members, offer, terms
from servicing.models import Loan
from servicing.transfers import request_disbursement


@pytest.fixture
def loan(application, offer, members):
    reservation = select_application(
        lender_id=members[0].id,
        application_id=application.id,
        expected_offer_version=offer.version,
        operation_id=uuid.uuid4(),
    )
    agreement = reservation.agreements.get()
    for member in members[:2]:
        result = accept_agreement(
            member_id=member.id,
            agreement_id=agreement.id,
            expected_hash=agreement.hash,
            operation_id=uuid.uuid4(),
        )
    loan = Loan.objects.get(pk=result.loan_id)
    request_disbursement(loan_id=loan.id, actor_id=members[0].id, operation_id=uuid.uuid4())
    loan.refresh_from_db()
    return loan
