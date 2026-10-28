from datetime import timedelta

import pytest
from accounts.models import Member
from config.errors import DomainError
from django.utils import timezone
from eligibility.services import check_eligibility
from verification.models import VerificationCase
from verification.services import review_check

pytestmark = pytest.mark.django_db


def test_self_review_denied():
    user = Member.objects.create_user(
        username="admin",
        email="admin@example.test",
        is_staff=True,
        staff_role="admin",
        staff_step_up_until=timezone.now() + timedelta(minutes=5),
    )
    case = VerificationCase.objects.create(member=user, kind="identity")
    with pytest.raises(DomainError):
        review_check(
            actor_id=user.pk, case_id=case.pk, expected_version=1, outcome="approved", reason="test"
        )


def test_review_requires_fresh_step_up_and_version():
    staff = Member.objects.create_user(
        username="review", email="review@example.test", is_staff=True, staff_role="reviewer"
    )
    user = Member.objects.create_user(username="subject", email="subject@example.test")
    case = VerificationCase.objects.create(member=user, kind="identity", assigned_to=staff)
    with pytest.raises(DomainError):
        review_check(
            actor_id=staff.pk,
            case_id=case.pk,
            expected_version=1,
            outcome="approved",
            reason="test",
        )
    staff.staff_step_up_until = timezone.now() + timedelta(minutes=5)
    staff.save()
    review_check(
        actor_id=staff.pk, case_id=case.pk, expected_version=1, outcome="approved", reason="test"
    )
    with pytest.raises(DomainError):
        review_check(
            actor_id=staff.pk,
            case_id=case.pk,
            expected_version=1,
            outcome="approved",
            reason="replay",
        )


def test_upload_or_expired_evidence_does_not_approve_eligibility():
    user = Member.objects.create_user(username="person", email="person@example.test")
    for kind in ["identity", "income", "contact", "funding_account"]:
        VerificationCase.objects.create(
            member=user,
            kind=kind,
            status="approved",
            expires_at=timezone.now() - timedelta(seconds=1),
        )
    assert not check_eligibility(member_id=user.pk, purpose="apply", at=timezone.now()).allowed


def test_sandbox_checks_never_enable_live(settings):
    user = Member.objects.create_user(username="person", email="person@example.test")
    for kind in ["identity", "income", "contact", "funding_account"]:
        VerificationCase.objects.create(member=user, kind=kind, status="approved")
    settings.ENVIRONMENT = "live"
    assert not check_eligibility(member_id=user.pk, purpose="disburse", at=timezone.now()).allowed
