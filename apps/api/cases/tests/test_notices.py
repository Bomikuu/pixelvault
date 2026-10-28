from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from cases.models import Notice, NoticePreference
from cases.notices import schedule_notices

pytestmark = pytest.mark.django_db


def test_notice_quiet_hours_and_frequency(loan, members):
    due = loan.agreement.disclosure["schedule"][0]["due_date"]
    date_part = datetime.fromisoformat(due)
    quiet = date_part.replace(hour=21, tzinfo=ZoneInfo("Asia/Manila"))
    assert schedule_notices(at=quiet)["deferred"] == "quiet_hours"
    assert Notice.objects.count() == 0
    daytime = quiet.replace(hour=9)
    assert schedule_notices(at=daytime)["created"] == 1
    assert schedule_notices(at=daytime.replace(hour=10))["created"] == 0
    notice = Notice.objects.get()
    assert notice.member_id == loan.borrower_id
    assert notice.status == "captured"


def test_opt_out_does_not_send_reference_or_guarantor_notice(loan, members):
    NoticePreference.objects.create(member=members[1], debt_reminders=False)
    day = datetime.fromisoformat(loan.agreement.disclosure["schedule"][0]["due_date"]).replace(
        hour=9, tzinfo=ZoneInfo("Asia/Manila")
    )
    assert schedule_notices(at=day)["created"] == 0
    assert not Notice.objects.exists()


def test_already_satisfied_installment_does_not_trigger_debt_reminder(loan, members):
    from servicing.models import LedgerEntry

    first = loan.agreement.disclosure["schedule"][0]
    day = datetime.fromisoformat(first["due_date"]).replace(hour=9, tzinfo=ZoneInfo("Asia/Manila"))
    LedgerEntry.objects.create(
        loan=loan,
        kind="collection",
        principal_delta=-first["principal"],
        interest_delta=-first["interest"],
        amount=first["total"],
        source_key="paid-before-reminder",
        effective_at=day,
    )
    loan.principal_balance -= first["principal"]
    loan.save()
    assert schedule_notices(at=day)["created"] == 0
