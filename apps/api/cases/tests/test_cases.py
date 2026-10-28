import uuid

import pytest
from accounts.models import Member
from config.errors import DomainError

from cases.services import assign_case, case_for, decide_case, open_case

pytestmark = pytest.mark.django_db


def test_case_access_is_party_or_assigned_staff_only(loan, members):
    case = open_case(
        actor_id=members[1].id,
        loan_id=loan.id,
        kind="hardship",
        body="Please review dates",
        operation_id=uuid.uuid4(),
    )
    assert case_for(actor_id=members[0].id, case_id=case.id).id == case.id
    with pytest.raises(DomainError):
        case_for(actor_id=members[2].id, case_id=case.id)
    staff = Member.objects.create_user(
        username="support",
        email="support@example.test",
        password="not-a-real-password",
        is_staff=True,
        staff_role="support",
    )
    with pytest.raises(DomainError):
        case_for(actor_id=staff.id, case_id=case.id)
    assign_case(actor_id=staff.id, case_id=case.id)
    assert case_for(actor_id=staff.id, case_id=case.id).id == case.id


def test_suspended_member_can_open_complaint_without_fraud_change(members):
    members[1].suspended = True
    members[1].save()
    case = open_case(
        actor_id=members[1].id,
        kind="complaint",
        body="Please investigate",
        operation_id=uuid.uuid4(),
    )
    assert case.status == "open"
    members[1].refresh_from_db()
    assert members[1].is_active


def test_case_decision_requires_assignment_and_current_version(loan, members):
    case = open_case(
        actor_id=members[1].id,
        loan_id=loan.id,
        kind="dispute",
        body="Please investigate",
        operation_id=uuid.uuid4(),
    )
    staff = Member.objects.create_user(
        username="support",
        email="support@example.test",
        password="not-a-real-password",
        is_staff=True,
        staff_role="support",
    )
    assign_case(actor_id=staff.id, case_id=case.id)
    decide_case(
        actor_id=staff.id,
        case_id=case.id,
        expected_version=1,
        decision="needs_information",
        reason="Evidence requested",
    )
    with pytest.raises(DomainError):
        decide_case(
            actor_id=staff.id,
            case_id=case.id,
            expected_version=1,
            decision="resolved",
            reason="Old version",
        )
    assert case.decisions.count() == 1
