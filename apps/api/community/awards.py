from datetime import datetime
from zoneinfo import ZoneInfo

from config.errors import DomainError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import AchievementHold, Award, AwardCorrection, Contribution
from .permissions import member_for

EDUCATIONAL_CONTRIBUTION_THRESHOLDS = {
    "good_neighbor": 1,
    "shared_wisdom": 3,
    "helping_hand": 5,
    "community_guide": 10,
}


def approved_contribution_ids(*, member_id):
    """Count educational work once, even across case/whitespace variants."""
    approved = []
    contribution_bodies = set()
    for contribution in Contribution.objects.filter(
        member_id=member_id, status="approved"
    ).order_by("created_at", "id"):
        canonical = " ".join(contribution.body.lower().split())
        if canonical not in contribution_bodies:
            contribution_bodies.add(canonical)
            approved.append(str(contribution.id))
    return approved


def current_educational_evidence(*, member):
    approved = approved_contribution_ids(member_id=member.id)
    return {
        "bright_start": [str(member.id)] if member.literacy_completed else [],
        **{
            key: approved if len(approved) >= threshold else []
            for key, threshold in EDUCATIONAL_CONTRIBUTION_THRESHOLDS.items()
        },
    }


def _has_transaction_cycle(member_id):
    from servicing.models import Loan

    frontier = {member_id}
    visited = set()
    for _depth in range(8):
        targets = set(
            Loan.objects.filter(
                lender_id__in=frontier, disbursement_status="confirmed"
            ).values_list("borrower_id", flat=True)
        )
        if member_id in targets:
            return True
        visited |= frontier
        frontier = targets - visited
        if not frontier:
            return False
        if len(visited) > 1000:
            return True  # A large ambiguous activity component needs review, not automatic trust.
    return False


@transaction.atomic
def evaluate_awards(*, member_id, rule_version="v1"):
    if rule_version != "v1":
        raise DomainError("unknown_rule", "This achievement rule version is not supported.")
    member = member_for(member_id)
    # Serializes repeated evaluations for the same member, including previously missing awards.
    type(member).objects.select_for_update().get(pk=member_id)
    from verification.models import VerificationCase

    onboarding = True
    for kind in ("identity", "income", "contact", "funding_account"):
        check = (
            VerificationCase.objects.filter(member_id=member_id, kind=kind)
            .order_by("-created_at")
            .first()
        )
        onboarding = onboarding and bool(
            check
            and check.status == "approved"
            and (check.expires_at is None or check.expires_at > timezone.now())
        )
    evidence = {
        "first_chapter": [str(member_id)] if onboarding and member.literacy_completed else [],
        **current_educational_evidence(member=member),
        "clockwork": [],
        "full_circle": [],
        "open_book": [],
        "fresh_start": [],
    }
    if (
        _has_transaction_cycle(member_id)
        and not AchievementHold.objects.filter(
            member_id=member_id, reason="reciprocal_transactions"
        ).exists()
    ):
        AchievementHold.objects.create(member_id=member_id, reason="reciprocal_transactions")
    held = AchievementHold.objects.filter(member_id=member_id, resolved=False).exists()
    evidence.update(current_financial_evidence(member_id=member_id))
    changed = []
    for key, facts in evidence.items():
        award = Award.objects.filter(
            member_id=member_id, key=key, rule_version=rule_version
        ).first()
        eligible = bool(facts)
        if not award and eligible:
            award = Award.objects.create(
                member_id=member_id,
                key=key,
                rule_version=rule_version,
                evidence=facts,
                eligible=True,
                earned_at=timezone.now(),
                private=key == "fresh_start",
            )
            changed.append(str(award.id))
        elif award and award.eligible != eligible:
            AwardCorrection.objects.create(
                award=award,
                reason="evidence_eligibility_changed",
                evidence=facts,
                eligible=eligible,
            )
            award.eligible = eligible
            award.evidence = facts
            award.save(update_fields=["eligible", "evidence", "updated_at"])
            changed.append(str(award.id))
    return {"changed_award_ids": changed, "review_pending": held}


def current_financial_evidence(*, member_id, at=None):
    """Read current authoritative facts without changing private awards/history."""
    from servicing.models import Loan

    at = at or timezone.now()
    evidence = {key: [] for key in ("clockwork", "full_circle", "open_book", "fresh_start")}
    holds = AchievementHold.objects.filter(member_id=member_id)
    if holds.filter(resolved=False).exists():
        return evidence
    if (
        _has_transaction_cycle(member_id)
        and not holds.filter(reason="reciprocal_transactions", resolved=True).exists()
    ):
        return evidence
    loans = Loan.objects.filter(
        Q(borrower_id=member_id) | Q(lender_id=member_id), disbursement_status="confirmed"
    ).select_related("agreement")
    completed_disclosures = []
    for loan in loans:
        entries = list(loan.ledger.filter(effective_at__lte=at).order_by("effective_at"))
        from .domain import has_pending_correction

        pending = has_pending_correction(loan)
        if (
            loan.borrower_id == member_id
            and loan.status == "repaid"
            and not loan.principal_balance
            and not loan.interest_balance
            and not pending
        ):
            evidence["full_circle"].append(str(loan.id))
            if loan.active_amendment_id:
                evidence["fresh_start"].append(str(loan.active_amendment_id))
        if loan.borrower_id == member_id and not pending:
            cumulative = 0
            timely = []
            if loan.active_amendment_id:
                activation = loan.ledger.filter(
                    kind="amendment_activated", metadata__proposal_id=str(loan.active_amendment_id)
                ).first()
                if not activation:
                    continue
                entries = [
                    entry for entry in entries if entry.effective_at >= activation.effective_at
                ]
                cumulative = int(
                    (loan.active_disclosure or {}).get("preserved_accrued_interest", 0)
                )
            from servicing.amendments import active_disclosure_for

            for installment in active_disclosure_for(loan).get("schedule", []):
                cumulative += int(installment["total"])
                due = datetime.fromisoformat(installment["due_date"]).date()
                paid = sum(
                    max(
                        0,
                        entry.amount
                        - sum(
                            reversal.amount
                            for reversal in entries
                            if reversal.kind == "collection_reversed"
                            and reversal.metadata.get("original_source") == entry.source_key
                        ),
                    )
                    for entry in entries
                    if entry.kind == "collection"
                    and entry.effective_at.astimezone(ZoneInfo("Asia/Manila")).date() <= due
                )
                if paid >= cumulative:
                    timely.append(f"{loan.id}:{due.isoformat()}")
            if len(timely) >= 3:
                evidence["clockwork"].extend(timely)
        if (
            loan.lender_id == member_id
            and loan.status == "repaid"
            and not loan.principal_balance
            and not loan.interest_balance
            and not pending
            and loan.agreement.state == "accepted"
            and loan.agreement.disclosure.get("schedule")
            and loan.agreement.acceptances.count() == 2
        ):
            from cases.models import Case

            if not Case.objects.filter(
                loan_id=loan.id, kind="disclosure", status="substantiated"
            ).exists():
                completed_disclosures.append(str(loan.agreement_id))
    if len(set(completed_disclosures)) >= 3:
        evidence["open_book"] = completed_disclosures
    return evidence


def public_financial_award_eligible(award, *, evidence=None):
    if award.key not in ("clockwork", "full_circle", "open_book", "fresh_start"):
        return True
    if award.private or not award.eligible:
        return False
    facts = (
        evidence if evidence is not None else current_financial_evidence(member_id=award.member_id)
    )
    return bool(facts.get(award.key))
