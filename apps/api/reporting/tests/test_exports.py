from datetime import timedelta

import pytest
from accounts.models import Member
from config.errors import DomainError
from django.utils import timezone

from reporting.exports import download_export, neutralize, request_export

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("value", ["=SUM(1,2)", "+cmd", "-10", "@calc", "  =A1", "\t@data"])
def test_csv_formula_cells_neutralized(value):
    assert neutralize(value).startswith("'")


def test_export_download_rechecks_permission_and_expiry(members):
    staff = Member.objects.create_user(
        username="finance",
        email="finance@example.test",
        password="not-a-real-password",
        is_staff=True,
        staff_role="finance",
    )
    job = request_export(actor_id=staff.id, purpose="operations_summary", filters={})
    content = download_export(actor_id=staff.id, job_id=job.id)
    assert "principal_disbursed" in content
    with pytest.raises(DomainError):
        download_export(actor_id=members[0].id, job_id=job.id)
    staff.staff_role = "moderator"
    staff.save()
    with pytest.raises(DomainError):
        download_export(actor_id=staff.id, job_id=job.id)
    job.expires_at = timezone.now() - timedelta(seconds=1)
    job.save()
    with pytest.raises(DomainError) as error:
        download_export(actor_id=staff.id, job_id=job.id)
    assert error.value.status_code == 410


def test_member_export_does_not_accept_other_member_filter(members):
    with pytest.raises(DomainError):
        request_export(
            actor_id=members[1].id,
            purpose="member_statement",
            filters={"actor_id": str(members[0].id)},
        )
