"""Owner-scoped views. No eligibility decisions or financial writes."""

from datetime import date, timedelta
from django.db.models import Q, Count
from django.utils import timezone
from config.errors import DomainError
from servicing.models import Loan
from servicing.projections import get_loan_projection, member_summary
from .models import ActionRead, ThreadRead


def scoped_loans(member_id, role=None):
    query = Loan.objects.select_related("agreement", "borrower", "lender").filter(
        Q(borrower_id=member_id) | Q(lender_id=member_id)
    )
    return query.filter(**{f"{role}_id": member_id}) if role in ("borrower", "lender") else query


def thread_counts(member_id, threads):
    from community.models import Message

    threads = list(threads)
    if not threads:
        return {}
    reads = {
        row.thread_id: row.through
        for row in ThreadRead.objects.filter(member_id=member_id, thread__in=threads)
    }
    condition = Q(pk__in=[])
    for thread in threads:
        if thread.id in reads:
            condition |= Q(thread_id=thread.id, created_at__gt=reads[thread.id])
        else:
            condition |= Q(thread_id=thread.id)
    result = {thread.id: 0 for thread in threads}
    result.update(
        {
            row["thread_id"]: row["total"]
            for row in Message.objects.filter(condition)
            .exclude(sender_id=member_id)
            .values("thread_id")
            .annotate(total=Count("id"))
        }
    )
    return result


def decisions(member_id):
    from marketplace.models import LoanApplication
    from negotiations.models import Room

    applications = (
        LoanApplication.objects.filter(
            offer__lender_id=member_id, status__in=["submitted", "reviewing", "selected"]
        )
        .exclude(reservation__agreements__loan__isnull=False)
        .select_related("borrower", "offer", "reservation")
        .order_by("created_at")[:100]
    )
    rows = []
    for application in applications:
        reservation = getattr(application, "reservation", None)
        rows.append(
            {
                "id": str(application.id),
                "title": application.purpose or "Private application",
                "offer_title": application.offer.title,
                "borrower": member_summary(application.borrower),
                "amount": str(application.terms["principal"]),
                "status": application.status,
                "created_at": application.created_at.isoformat(),
                "reservation_expires_at": reservation.expires_at.isoformat()
                if reservation and reservation.status == "reserved"
                else None,
                "offer_expires_at": application.offer.expires_at.isoformat(),
                "href": f"/applications/{application.id}",
            }
        )
    meetings = [
        {
            "id": str(room.id),
            "person": member_summary(room.participant),
            "title": room.offer.title,
            "scheduled_at": room.scheduled_at.isoformat() if room.scheduled_at else None,
            "state": room.state,
            "href": f"/meetings/{room.id}",
        }
        for room in Room.objects.filter(lender_id=member_id, state="negotiating")
        .select_related("participant", "offer")
        .order_by("scheduled_at")[:100]
    ]
    return {
        "applications": rows,
        "meetings": meetings,
        "limit": 100,
        "server_time": timezone.now().isoformat(),
    }


def calendar(member_id, params):
    today = timezone.localdate()
    try:
        start = date.fromisoformat(params.get("start", today.replace(day=1).isoformat()))
        end = date.fromisoformat(params.get("end", (start + timedelta(days=365)).isoformat()))
        if not 0 < (end - start).days <= 366:
            raise ValueError
    except (TypeError, ValueError):
        raise DomainError(
            "invalid_period", "Choose ordered calendar dates within one year."
        ) from None
    role = params.get("role", "borrower")
    if role not in ("borrower", "lender"):
        raise DomainError("invalid_role", "Choose borrowing or lending.")
    loans = (
        scoped_loans(member_id, role)
        .filter(disbursement_status="confirmed", status__in=["active", "repaid"])
        .order_by("-created_at")[:200]
    )
    rows = []
    for loan in loans:
        projection = get_loan_projection(loan_id=loan.id)
        paid_entries = loan.ledger.filter(kind__in=["collection", "collection_reversed"])
        if loan.active_amendment_id:
            activation = loan.ledger.filter(
                source_key=f"amendment:{loan.active_amendment_id}"
            ).first()
            if activation:
                paid_entries = paid_entries.filter(created_at__gt=activation.created_at)
        paid = sum(row.amount if row.kind == "collection" else -row.amount for row in paid_entries)
        carry = int((loan.active_disclosure or {}).get("preserved_accrued_interest", 0))
        paid = max(0, paid - carry)
        for sequence, line in enumerate(projection["schedule"], 1):
            total = int(line["total"])
            covered = min(total, max(0, paid))
            paid -= covered
            if start.isoformat() <= line["due_date"] < end.isoformat():
                remaining = 0 if loan.status == "repaid" else total - covered
                status = (
                    "covered"
                    if not remaining
                    else "overdue"
                    if line["due_date"] < today.isoformat()
                    else "partial"
                    if covered
                    else "scheduled"
                )
                rows.append(
                    {
                        "id": f"{loan.id}:{sequence}",
                        "loan_id": str(loan.id),
                        "sequence": sequence,
                        "due_date": line["due_date"],
                        "amount": str(total),
                        "covered": str(covered),
                        "remaining": str(remaining),
                        "status": status,
                        "person": member_summary(
                            loan.lender if role == "borrower" else loan.borrower
                        ),
                        "href": f"/loans/{loan.id}",
                        "updated_at": loan.updated_at.isoformat(),
                    }
                )
    return {
        "events": sorted(rows, key=lambda row: (row["due_date"], row["id"])),
        "start": start.isoformat(),
        "end": end.isoformat(),
        "timezone": "Asia/Manila",
        "role": role,
        "loan_limit": 200,
        "notice": "Current signed schedule, with collections applied in order. Scheduled amounts include future interest; consult the loan for the current payoff. Covered is not lender settlement.",
    }


def actions(member_id):
    from community.models import Thread
    from marketplace.models import LoanApplication
    from negotiations.models import Room
    from verification.models import VerificationCase

    rows = []

    def add(key, kind, title, detail, href, at, urgent=False):
        rows.append(
            {
                "key": key,
                "kind": kind,
                "title": title,
                "detail": detail,
                "href": href,
                "at": at,
                "urgent": urgent,
            }
        )

    for loan in (
        scoped_loans(member_id).filter(status="awaiting_disbursement").order_by("-updated_at")[:50]
    ):
        add(
            f"funding:{loan.id}:{loan.disbursement_status}",
            "payment",
            "Review your funding status",
            "The agreement is accepted; confirmed funding is a separate step.",
            f"/loans/{loan.id}",
            loan.updated_at.isoformat(),
        )
    for loan in (
        scoped_loans(member_id)
        .filter(status="active", disbursement_status="confirmed")
        .order_by("-created_at")[:100]
    ):
        projection = get_loan_projection(loan_id=loan.id)
        due = projection["next_due_date"]
        if due and due <= (timezone.localdate() + timedelta(days=7)).isoformat():
            borrowing = loan.borrower_id == member_id
            add(
                f"payment:{loan.id}:{due}",
                "payment",
                "Payment needs attention" if borrowing else "Collection coming up",
                f"Scheduled for {due} · Manila. Open the loan for exact amounts.",
                f"/loans/{loan.id}",
                f"{due}T00:00:00+08:00",
                due < timezone.localdate().isoformat(),
            )
    for application in (
        LoanApplication.objects.filter(
            Q(borrower_id=member_id) | Q(offer__lender_id=member_id),
            status__in=["submitted", "reviewing", "selected"],
        )
        .exclude(reservation__agreements__loan__isnull=False)
        .select_related("offer")
        .order_by("-updated_at")[:50]
    ):
        lender = application.offer.lender_id == member_id
        add(
            f"application:{application.id}:{application.status}",
            "application",
            "Review a private application" if lender else "Your application update",
            f"{application.offer.title} · {application.status.replace('_', ' ')}",
            f"/applications/{application.id}",
            application.updated_at.isoformat(),
            lender and application.status in ("submitted", "reviewing"),
        )
    for room in (
        Room.objects.filter(
            Q(lender_id=member_id) | Q(participant_id=member_id), state="negotiating"
        )
        .select_related("offer")
        .order_by("-updated_at")[:50]
    ):
        needs_new_time = bool(
            room.scheduled_at and room.scheduled_at < timezone.now() - timedelta(hours=1)
        )
        add(
            f"meeting:{room.id}:{room.schedule_version}:{'elapsed' if needs_new_time else 'upcoming'}",
            "meeting",
            "Meeting needs a new time"
            if needs_new_time
            else "Review your meeting time"
            if room.scheduled_at
            else "Schedule your private meeting",
            room.offer.title,
            f"/meetings/{room.id}",
            room.scheduled_at.isoformat() if room.scheduled_at else room.updated_at.isoformat(),
        )
    latest_checks = (
        VerificationCase.objects.filter(member_id=member_id)
        .order_by("kind", "-created_at", "-id")
        .distinct("kind")
    )
    for check in latest_checks:
        add(
            f"verification:{check.id}:{check.version}",
            "verification",
            f"{check.kind.replace('_', ' ').title()} review update",
            check.status.replace("_", " "),
            "/verification",
            check.updated_at.isoformat(),
            check.status == "needs_information",
        )
    threads = list(Thread.objects.filter(participants__id=member_id).order_by("-updated_at")[:100])
    counts = thread_counts(member_id, threads)
    for thread in threads:
        if counts[thread.id]:
            latest = thread.messages.exclude(sender_id=member_id).order_by("-created_at").first()
            href = (
                f"/meetings/{thread.room.id}"
                if hasattr(thread, "room")
                else f"/inbox?thread={thread.id}"
            )
            add(
                f"message:{thread.id}:{latest.id}",
                "message",
                "Unread private messages",
                f"{counts[thread.id]} unread in this conversation",
                href,
                latest.created_at.isoformat(),
            )
    read = set(ActionRead.objects.filter(member_id=member_id).values_list("key", flat=True))
    for row in rows:
        row["read"] = row["key"] in read
    rows.sort(key=lambda row: row["at"], reverse=True)
    rows.sort(key=lambda row: (not row["urgent"], row["read"]))
    return {
        "actions": rows[:200],
        "unread": sum(not row["read"] for row in rows),
        "limit": 200,
        "server_time": timezone.now().isoformat(),
    }
