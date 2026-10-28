from community.domain import loan_for
from community.messaging import clean_text
from community.permissions import member_for, staff_for
from config.errors import DomainError
from django.db import transaction
from django.db.models import Q

from .models import Case, CaseDecision, CaseResponse

KINDS = {"hardship", "complaint", "dispute", "privacy", "appeal", "disclosure"}


def scoped_cases(actor):
    queryset = Case.objects.all()
    from servicing.models import Loan

    loans = Loan.objects.filter(Q(borrower=actor) | Q(lender=actor)).values_list("id", flat=True)
    scope = Q(opened_by=actor) | Q(loan_id__in=loans)
    if (
        actor.is_active
        and actor.is_staff
        and actor.staff_role in ("support", "admin")
        and not actor.suspended
    ):
        scope |= Q(assigned_to=actor)
    return queryset.filter(scope)


def case_for(*, actor_id, case_id):
    member = member_for(actor_id)
    try:
        return scoped_cases(member).get(pk=case_id)
    except (Case.DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)


@transaction.atomic
def open_case(*, actor_id, loan_id=None, kind, body, operation_id):
    member = member_for(actor_id)
    type(member).objects.select_for_update().get(pk=actor_id)
    if kind not in KINDS:
        raise DomainError("invalid_case_kind", "Choose a supported private case category.")
    if loan_id:
        loan = loan_for(loan_id, actor_id)
        if kind == "hardship" and actor_id != loan.borrower_id:
            raise DomainError(
                "forbidden", "Only the borrower can request a hardship arrangement.", 403
            )
    elif kind in ("hardship", "dispute", "disclosure"):
        raise DomainError("loan_required", "Choose the associated loan.")
    body = clean_text(body, 5000)
    previous = Case.objects.filter(opened_by_id=actor_id, operation_id=operation_id).first()
    if previous:
        if (
            str(previous.loan_id or "") != str(loan_id or "")
            or previous.kind != kind
            or previous.body != body
        ):
            raise DomainError(
                "idempotency_conflict", "This key was used for a different case.", 409
            )
        return previous
    return Case.objects.create(
        opened_by_id=actor_id, loan_id=loan_id, kind=kind, body=body, operation_id=operation_id
    )


@transaction.atomic
def assign_case(*, actor_id, case_id):
    actor = staff_for(actor_id, ("support",))
    try:
        case = Case.objects.select_for_update().get(pk=case_id)
    except (Case.DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)
    if case.opened_by_id == actor_id:
        raise DomainError("self_review", "Staff cannot review their own case.", 403)
    if case.loan_id:
        loan = loan_for(case.loan_id)
        if actor_id in (loan.lender_id, loan.borrower_id):
            raise DomainError(
                "self_review", "Staff cannot review a case involving their loan.", 403
            )
    if case.assigned_to_id and case.assigned_to_id != actor_id:
        raise DomainError("assigned_elsewhere", "This case is already assigned.", 409)
    case.assigned_to = actor
    case.save(update_fields=["assigned_to", "updated_at"])
    return case


@transaction.atomic
def decide_case(*, actor_id, case_id, expected_version, decision, reason):
    staff_for(actor_id, ("support",))
    case = case_for(actor_id=actor_id, case_id=case_id)
    case = Case.objects.select_for_update().get(pk=case.id)
    if case.assigned_to_id != actor_id or case.opened_by_id == actor_id:
        raise DomainError("forbidden", "An independent assigned reviewer is required.", 403)
    if case.version != expected_version:
        raise DomainError("version_conflict", "This case changed. Refresh before deciding.", 409)
    if decision not in ("needs_information", "resolved", "dismissed", "substantiated"):
        raise DomainError("invalid_decision", "Choose an explicit case outcome.")
    reason = clean_text(reason, 5000)
    CaseDecision.objects.create(
        case=case,
        actor_id=actor_id,
        decision=decision,
        reason=reason,
        previous_version=expected_version,
    )
    case.status = decision
    case.version += 1
    case.save(update_fields=["status", "version", "updated_at"])
    # A complaint never mutates credit history, a balance, account fraud, or a public badge.
    return case


def respond_case(*, actor_id, case_id, body):
    case = case_for(actor_id=actor_id, case_id=case_id)
    return CaseResponse.objects.create(case=case, author_id=actor_id, body=clean_text(body, 5000))


@transaction.atomic
def review_legal_remedy(*, actor_id, case_id, expected_version, reason):
    staff_for(actor_id, ("support",))
    case = case_for(actor_id=actor_id, case_id=case_id)
    case = Case.objects.select_for_update().get(pk=case.id)
    if case.assigned_to_id != actor_id or case.version != expected_version:
        raise DomainError(
            "version_conflict", "An assigned reviewer and current case version are required.", 409
        )
    case.legal_remedy_reviewed = True
    case.legal_remedy_reason = clean_text(reason, 5000)
    case.version += 1
    case.save()
    CaseDecision.objects.create(
        case=case,
        actor_id=actor_id,
        decision="remedy_eligibility_review",
        reason=case.legal_remedy_reason,
        previous_version=expected_version,
    )
    return case
