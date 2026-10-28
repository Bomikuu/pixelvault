from datetime import timedelta

from accounts.presence import coarse_activity
from agreements.views import agreement_data
from servicing.projections import member_summary
from django.utils import timezone

from .models import Attendance
from .services import both_approved, current_attendance, evidence_hash, evidence_reviewed


def summary(room):
    return {
        "id": str(room.id),
        "kind": room.kind,
        "state": room.state,
        "revision": room.revision,
        "event_sequence": room.event_sequence,
        "offer": {"id": str(room.offer_id), "title": room.offer.title},
        "lender": member_summary(room.lender),
        "participant": member_summary(room.participant),
        "scheduled_at": room.scheduled_at.isoformat() if room.scheduled_at else None,
        "amount": room.proposal["amount"],
        "created_at": room.created_at.isoformat(),
    }


def snapshot(room, actor_id):
    here = current_attendance(room)
    attendance = {row.member_id: row for row in Attendance.objects.filter(room=room)}
    from verification.models import VerificationCase

    verification = {
        str(member_id): "expired" if expires_at and expires_at <= timezone.now() else status
        for member_id, status, expires_at in VerificationCase.objects.filter(
            member_id__in=[room.lender_id, room.participant_id], kind="identity"
        )
        .order_by("created_at")
        .values_list("member_id", "status", "expires_at")
    }
    participants = []
    for member in (room.lender, room.participant):
        row = attendance.get(member.id)
        participants.append(
            {
                **member_summary(member),
                "role": "lender"
                if member.id == room.lender_id
                else ("investor" if room.kind == "investment" else "borrower"),
                "schedule_accepted": bool(
                    row and row.schedule_version == room.schedule_version and room.scheduled_at
                ),
                "checked_in": bool(
                    row and row.schedule_version == room.schedule_version and row.checked_in_at
                ),
                "here": member.id in here,
                "in_lobby": bool(
                    row
                    and row.lobby_seen_at
                    and row.lobby_seen_at > timezone.now() - timedelta(seconds=45)
                    and member.id not in here
                ),
                "last_seen_label": coarse_activity(
                    max(value for value in (row.heartbeat_at, row.lobby_seen_at) if value)
                )["label"]
                .replace("Last online", "Last here")
                .replace("Online now", "Last here recently")
                if row and (row.heartbeat_at or row.lobby_seen_at)
                else "Not seen in this meeting yet",
            }
        )
    messages = list(
        room.thread.messages.select_related("sender").order_by("-created_at", "-id")[:100]
    )
    events = list(
        room.events.select_related("actor").exclude(kind="message.sent").order_by("-sequence")[:60]
    )
    sent_ping = (
        room.events.filter(kind="meeting.ping", actor_id=actor_id).order_by("-created_at").first()
    )
    received_ping = (
        room.events.filter(kind="meeting.ping")
        .exclude(actor_id=actor_id)
        .select_related("actor")
        .order_by("-created_at")
        .first()
    )
    return {
        **summary(room),
        "pings": {
            "last_sent_at": sent_ping.created_at.isoformat() if sent_ping else None,
            "next_allowed_at": (sent_ping.created_at + timedelta(seconds=60)).isoformat()
            if sent_ping
            else None,
            "last_received_at": received_ping.created_at.isoformat() if received_ping else None,
            "from_name": received_ping.actor.display_name if received_ping else None,
        },
        "agenda": room.agenda,
        "proposal": room.proposal,
        "proposal_version": room.proposal_version,
        "proposal_hash": room.proposal_hash,
        "schedule_version": room.schedule_version,
        "participants": participants,
        "evidence_hash": evidence_hash(room),
        "evidence_reviewed": evidence_reviewed(room),
        "evidence_reviewed_by": [
            str(value)
            for value in room.approvals.filter(
                kind="evidence", proposal_version=room.proposal_version, hash=evidence_hash(room)
            ).values_list("member_id", flat=True)
        ],
        "both_here": len(here) == 2,
        "both_approved": both_approved(room),
        "approved_by": [
            str(value)
            for value in room.approvals.filter(
                proposal_version=room.proposal_version, hash=room.proposal_hash, kind="proposal"
            ).values_list("member_id", flat=True)
        ],
        "visibility": room.visibility,
        "test_mode": True,
        "application_id": str(room.application_id) if room.application_id else None,
        "agreement": agreement_data(room.agreement) if room.agreement_id else None,
        "loan_id": str(room.agreement.loan.id)
        if room.agreement_id and hasattr(room.agreement, "loan")
        else None,
        "messages": [
            {
                "id": str(m.id),
                "body": m.body,
                "sender": member_summary(m.sender),
                "created_at": m.created_at.isoformat(),
            }
            for m in reversed(messages)
        ],
        "earlier_messages_available": room.thread.messages.count() > 100,
        "events": [
            {
                "id": str(e.id),
                "sequence": e.sequence,
                "kind": e.kind,
                "actor": e.actor.display_name,
                "created_at": e.created_at.isoformat(),
            }
            for e in reversed(events)
        ],
        "evidence": [
            {
                "id": str(e.id),
                "owner_id": str(e.owner_id),
                "owner_name": e.owner.display_name,
                "name": e.document.name,
                "category": e.category,
                "file_status": e.document.status,
                "authenticity": "not_verified",
                "created_at": e.created_at.isoformat(),
            }
            for e in room.evidence.filter(revoked=False).select_related("owner", "document")
        ],
        "eligibility": {
            "lender_identity": verification.get(str(room.lender_id), "not_submitted"),
            "participant_identity": verification.get(str(room.participant_id), "not_submitted"),
            "note": "A status is a recorded check, not a guarantee or permission to invest.",
        },
        "funding": {
            "status": "blocked" if room.kind == "investment" else "separate_disbursement",
            "confirmed_amount": 0,
            "blockers": [
                "Platform fee rate and capital-return policy are not approved.",
                "No approved contribution settlement or investor payout provider is configured.",
                "Uploaded receipts are evidence only; no capital is added automatically.",
            ]
            if room.kind == "investment"
            else [],
        },
        "calls": {
            "available": False,
            "reason": "A private, access-controlled audio/video provider isn't configured yet.",
        },
        "server_time": timezone.now().isoformat(),
    }
