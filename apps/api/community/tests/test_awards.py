import pytest
from verification.models import VerificationCase

from community.awards import evaluate_awards
from community.models import Award, AwardCorrection, Contribution
from community.profiles import community_level

pytestmark = pytest.mark.django_db


def approve_onboarding(member):
    for kind in ("identity", "contact", "income", "funding_account"):
        VerificationCase.objects.create(member=member, kind=kind, status="approved")
    member.literacy_completed = True
    member.save()


def test_first_chapter_requires_no_loan_and_is_idempotent(members):
    approve_onboarding(members[1])
    first = evaluate_awards(member_id=members[1].id)
    second = evaluate_awards(member_id=members[1].id)
    assert len(first["changed_award_ids"]) == 2
    assert second["changed_award_ids"] == []
    assert set(Award.objects.filter(member=members[1]).values_list("key", flat=True)) == {
        "first_chapter",
        "bright_start",
    }


def test_latest_rejection_overrides_older_approval(members):
    approve_onboarding(members[1])
    VerificationCase.objects.create(member=members[1], kind="identity", status="rejected")
    evaluate_awards(member_id=members[1].id)
    assert not Award.objects.filter(member=members[1], key="first_chapter").exists()
    assert Award.objects.filter(member=members[1], key="bright_start", eligible=True).exists()


def test_helping_hand_requires_five_approved_distinct_contributions(members):
    for index in range(4):
        Contribution.objects.create(
            member=members[1], title=str(index), body=f"lesson {index}", status="approved"
        )
    Contribution.objects.create(member=members[1], title="pending", body="not approved")
    evaluate_awards(member_id=members[1].id)
    assert not Award.objects.filter(member=members[1], key="helping_hand").exists()
    Contribution.objects.create(
        member=members[1], title="fifth", body="distinct fifth", status="approved"
    )
    evaluate_awards(member_id=members[1].id)
    assert Award.objects.filter(member=members[1], key="helping_hand", eligible=True).exists()


def test_reversal_hides_award_without_public_reason(members):
    approve_onboarding(members[1])
    evaluate_awards(member_id=members[1].id)
    members[1].literacy_completed = False
    members[1].save()
    evaluate_awards(member_id=members[1].id)
    assert not Award.objects.filter(member=members[1], eligible=True).exists()
    assert AwardCorrection.objects.count() == 2


def test_loan_amount_and_repeat_originations_give_no_xp(loan, members):
    evaluate_awards(member_id=members[1].id)
    assert community_level(members[1]) == "Newcomer"
    assert not Award.objects.filter(member=members[1]).exists()


def test_full_circle_waits_for_pending_reversal(loan, members):
    import uuid

    from payments.models import PaymentOperation, PaymentRoutingProfile, RefundOperation

    loan.status = "repaid"
    loan.principal_balance = 0
    loan.interest_balance = 0
    loan.save()
    routing = PaymentRoutingProfile.objects.create(
        name="test",
        project_id="synthetic",
        tenant_id="synthetic",
        credential_env="TEST_ONLY_UNUSED",
        webhook_secret_env="TEST_ONLY_UNUSED",
    )
    payment = PaymentOperation.objects.create(
        operation_id=uuid.uuid4(),
        loan=loan,
        routing=routing,
        payer=members[1],
        amount=100,
        payable_version="1",
        external_id="synthetic",
        status="succeeded",
        payload_hash="synthetic",
    )
    RefundOperation.objects.create(
        operation_id=uuid.uuid4(),
        payment_operation=payment,
        amount=100,
        reason="synthetic",
        status="uncertain",
    )
    evaluate_awards(member_id=members[1].id)
    assert not Award.objects.filter(member=members[1], key="full_circle").exists()


def test_orphan_refund_on_other_route_does_not_suppress_member_award(loan, members):
    from payments.models import EventInbox, PaymentRoutingProfile

    loan.status = "repaid"
    loan.principal_balance = loan.interest_balance = 0
    loan.save()
    routing = PaymentRoutingProfile.objects.create(
        name="unrelated",
        project_id="other",
        tenant_id="other",
        credential_env="UNUSED",
        webhook_secret_env="UNUSED",
    )
    EventInbox.objects.create(
        routing=routing,
        event_id="unrelated-refund",
        payload={"data": {"id": "unrelated-payment"}},
        payload_hash="synthetic",
        state="awaiting_collection",
    )
    evaluate_awards(member_id=members[1].id)
    assert Award.objects.filter(member=members[1], key="full_circle", eligible=True).exists()


def test_ledger_events_enqueue_durable_private_award_work(loan, members):
    from audit.models import OutboxMessage

    event_key = f"awards:{members[1].id}:ledger:{loan.ledger.get(kind='principal_disbursed').id}"
    event = OutboxMessage.objects.get(dedupe_key=event_key)
    assert event.kind == "awards.evaluate"
    assert event.payload == {"rule_version": "v1"}


def test_clockwork_uses_authoritative_effective_time_not_delivery_time(loan, members, monkeypatch):
    from datetime import datetime
    from zoneinfo import ZoneInfo

    from django.utils import timezone
    from servicing.models import LedgerEntry

    schedule = loan.agreement.disclosure["schedule"]
    last = datetime.fromisoformat(schedule[-1]["due_date"]).replace(
        hour=15, tzinfo=ZoneInfo("Asia/Manila")
    )
    monkeypatch.setattr(timezone, "now", lambda: last)
    for index, installment in enumerate(schedule):
        effective = datetime.fromisoformat(installment["due_date"]).replace(
            hour=10, tzinfo=ZoneInfo("Asia/Manila")
        )
        LedgerEntry.objects.create(
            loan=loan,
            kind="collection",
            amount=installment["total"],
            source_key=f"late-delivery-{index}",
            effective_at=effective,
        )
    evaluate_awards(member_id=members[1].id)
    assert Award.objects.filter(member=members[1], key="clockwork", eligible=True).exists()


def test_confirmed_historical_reversal_does_not_permanently_disqualify_recovery(loan, members):
    from django.utils import timezone
    from servicing.models import LedgerEntry

    LedgerEntry.objects.create(
        loan=loan,
        kind="collection_reversed",
        principal_delta=100,
        amount=100,
        source_key="old-resolved-refund",
        effective_at=timezone.now(),
    )
    loan.status = "repaid"
    loan.principal_balance = loan.interest_balance = 0
    loan.save()
    evaluate_awards(member_id=members[1].id)
    assert Award.objects.filter(member=members[1], key="full_circle", eligible=True).exists()
