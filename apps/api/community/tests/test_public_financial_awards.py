import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.utils import timezone
from payments.models import PaymentOperation, PaymentRoutingProfile, RefundOperation
from servicing.allocation import record_collection, reverse_collection
from servicing.models import LedgerEntry

from community.awards import evaluate_awards
from community.models import Award, AwardCorrection
from community.profiles import public_profile, set_public_badges

pytestmark = pytest.mark.django_db


def equip(member, key):
    evaluate_awards(member_id=member.id)
    award = Award.objects.get(member=member, key=key, eligible=True)
    set_public_badges(member_id=member.id, award_ids=[award.id])
    return award


def test_pending_refund_hides_financial_badge_without_waiting_for_worker(loan, members):
    record_collection(
        loan_id=loan.id,
        amount=loan.principal_balance,
        effective_at=timezone.now(),
        source_key="full-circle-payment",
    )
    award = equip(members[1], "full_circle")
    assert len(public_profile(handle=members[1].username)["badges"]) == 1
    route = PaymentRoutingProfile.objects.create(
        name="synthetic",
        project_id="synthetic",
        tenant_id="synthetic",
        credential_env="UNUSED",
        webhook_secret_env="UNUSED",
    )
    operation = PaymentOperation.objects.create(
        operation_id=uuid.uuid4(),
        loan=loan,
        routing=route,
        payer=members[1],
        amount=100,
        payable_version="1",
        external_id="badge-refund",
        status="succeeded",
        payload_hash="synthetic",
    )
    RefundOperation.objects.create(
        operation_id=uuid.uuid4(),
        payment_operation=operation,
        amount=100,
        reason="synthetic",
        status="uncertain",
    )
    data = public_profile(handle=members[1].username)
    assert data["badges"] == []
    assert "refund" not in str(data)
    award.refresh_from_db()
    assert award.eligible is True
    assert AwardCorrection.objects.filter(award=award).count() == 0


def test_reversal_hides_stale_award_immediately_and_recovery_preserves_history(loan, members):
    paid_at = timezone.now()
    record_collection(
        loan_id=loan.id,
        amount=loan.principal_balance,
        effective_at=paid_at,
        source_key="reversible-full-payment",
    )
    award = equip(members[1], "full_circle")
    earned_at = award.earned_at
    reverse_collection(
        source_key="reversible-full-payment",
        refund_key="badge-refund",
        amount=100,
        effective_at=paid_at + timedelta(seconds=1),
    )
    assert public_profile(handle=members[1].username)["badges"] == []
    award.refresh_from_db()
    assert award.eligible is True  # Public read does not rewrite the member's history.
    record_collection(
        loan_id=loan.id,
        amount=100,
        effective_at=paid_at + timedelta(seconds=2),
        source_key="recovery-full-payment",
    )
    assert len(public_profile(handle=members[1].username)["badges"]) == 1
    award.refresh_from_db()
    assert award.earned_at == earned_at


def test_clockwork_does_not_count_later_reversed_installments(loan, members, monkeypatch):
    schedule = loan.agreement.disclosure["schedule"]
    last_due = datetime.fromisoformat(schedule[-1]["due_date"]).replace(
        hour=15, tzinfo=ZoneInfo("Asia/Manila")
    )
    monkeypatch.setattr(timezone, "now", lambda: last_due + timedelta(days=1))
    for index, installment in enumerate(schedule):
        LedgerEntry.objects.create(
            loan=loan,
            kind="collection",
            amount=installment["total"],
            source_key=f"clockwork-original:{index}",
            effective_at=datetime.fromisoformat(installment["due_date"]).replace(
                hour=10, tzinfo=ZoneInfo("Asia/Manila")
            ),
        )
    award = equip(members[1], "clockwork")
    assert len(public_profile(handle=members[1].username)["badges"]) == 1
    LedgerEntry.objects.create(
        loan=loan,
        kind="collection_reversed",
        amount=100,
        source_key="clockwork-late-reversal",
        effective_at=last_due + timedelta(hours=1),
        metadata={"original_source": "clockwork-original:2"},
    )
    assert public_profile(handle=members[1].username)["badges"] == []
    award.refresh_from_db()
    assert award.eligible


def test_stale_open_book_claim_without_current_qualifying_loans_is_not_public(members):
    award = Award.objects.create(
        member=members[0],
        key="open_book",
        eligible=True,
        evidence=[str(uuid.uuid4()) for _ in range(3)],
        earned_at=timezone.now(),
    )
    set_public_badges(member_id=members[0].id, award_ids=[award.id])
    assert public_profile(handle=members[0].username)["badges"] == []
    award.refresh_from_db()
    assert award.eligible


def test_upheld_disclosure_finding_hides_open_book_before_worker(loan, members, terms):
    from accounts.models import Member
    from agreements.acceptance import accept_agreement
    from cases.services import assign_case, decide_case, open_case
    from marketplace.applications import apply_to_offer
    from marketplace.offers import publish_offer
    from marketplace.reservations import select_application
    from servicing.models import Loan
    from servicing.transfers import request_disbursement

    completed = [loan]
    for _ in range(2):
        offer = publish_offer(
            lender_id=members[0].id,
            terms=terms,
            declared_amount=terms.principal,
            operation_id=uuid.uuid4(),
        )
        application = apply_to_offer(
            borrower_id=members[1].id,
            offer_id=offer.id,
            principal=terms.principal,
            operation_id=uuid.uuid4(),
        )
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
        next_loan = Loan.objects.get(pk=result.loan_id)
        request_disbursement(
            loan_id=next_loan.id, actor_id=members[0].id, operation_id=uuid.uuid4()
        )
        next_loan.refresh_from_db()
        completed.append(next_loan)
    for settled in completed:
        record_collection(
            loan_id=settled.id,
            amount=settled.principal_balance,
            effective_at=timezone.now(),
            source_key=f"open-book-collection:{settled.id}",
        )
    award = equip(members[0], "open_book")
    assert len(public_profile(handle=members[0].username)["badges"]) == 1
    case = open_case(
        actor_id=members[1].id,
        loan_id=loan.id,
        kind="disclosure",
        body="Synthetic disclosure complaint",
        operation_id=uuid.uuid4(),
    )
    assert (
        len(public_profile(handle=members[0].username)["badges"]) == 1
    )  # Complaint alone proves nothing.
    reviewer = Member.objects.create_user(
        username="independent-support",
        email="independent-support@example.test",
        password=None,
        is_staff=True,
        staff_role="support",
    )
    assign_case(actor_id=reviewer.id, case_id=case.id)
    decide_case(
        actor_id=reviewer.id,
        case_id=case.id,
        expected_version=1,
        decision="substantiated",
        reason="Synthetic reviewed disclosure finding",
    )
    assert public_profile(handle=members[0].username)["badges"] == []
    award.refresh_from_db()
    assert award.eligible
