"""Private test-mode negotiations; discussion approvals never mint money."""

import hashlib
import json
import uuid
from datetime import timedelta

from audit.services import record_audit
from community.messaging import clean_text, ensure_thread, send_message
from community.models import Thread
from config.errors import DomainError
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from marketplace.models import LendingOffer, LoanApplication
from marketplace.offers import terms_for_amount
from agreements.types import integer

from .models import Approval, Attendance, Evidence, Room, RoomCommand, RoomEvent


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def active(actor_id):
    from accounts.models import Member

    if not Member.objects.filter(pk=actor_id, is_active=True, suspended=False).exists():
        raise DomainError("room_access", "This account cannot negotiate new agreements.", 403)


def room_for(room_id, actor_id, lock=False):
    from django.db.models import Q

    query = Room.objects.select_related(
        "offer", "lender", "participant", "application", "agreement"
    )
    if lock:
        query = query.select_for_update(of=("self",))
    try:
        return query.get(Q(lender_id=actor_id) | Q(participant_id=actor_id), pk=room_id)
    except (Room.DoesNotExist, ValueError):
        raise DomainError("not_found", "Meeting room not found.", 404) from None


def event(room, actor_id, kind, detail=None):
    room.event_sequence += 1
    room.save(update_fields=["event_sequence", "updated_at"])
    RoomEvent.objects.create(
        room=room, actor_id=actor_id, sequence=room.event_sequence, kind=kind, detail=detail or {}
    )


def current_attendance(room):
    now = timezone.now()
    return {
        row.member_id: row
        for row in room.attendance.filter(schedule_version=room.schedule_version)
        if row.checked_in_at
        and row.heartbeat_at
        and row.heartbeat_at > now - timedelta(seconds=45)
        and (not row.lobby_seen_at or row.heartbeat_at >= row.lobby_seen_at)
    }


def require_both(room):
    if len(current_attendance(room)) != 2:
        raise DomainError(
            "both_required", "Both people must check in and be here before confirming.", 409
        )


def both_approved(room):
    return (
        room.approvals.filter(
            proposal_version=room.proposal_version, hash=room.proposal_hash, kind="proposal"
        ).count()
        == 2
    )


def evidence_hash(room):
    from verification.models import VerificationCase

    checks = list(
        VerificationCase.objects.filter(member_id__in=[room.lender_id, room.participant_id])
        .order_by("id")
        .values("id", "version", "status", "expires_at")
    )
    docs = [
        {
            "id": str(e.id),
            "status": e.document.status,
            "updated_at": e.document.updated_at.isoformat(),
        }
        for e in room.evidence.filter(revoked=False).select_related("document").order_by("id")
    ]
    return digest(
        {
            "proposal": room.proposal_hash,
            "documents": docs,
            "checks": [{key: str(value) for key, value in c.items()} for c in checks],
        }
    )


def evidence_reviewed(room):
    return (
        room.approvals.filter(
            kind="evidence", proposal_version=room.proposal_version, hash=evidence_hash(room)
        ).count()
        == 2
    )


@transaction.atomic
def create_room(*, actor_id, data):
    active(actor_id)
    if settings.ENVIRONMENT != "test":
        raise DomainError("test_only", "New agreement rooms are currently test-only.", 403)
    try:
        operation_id = uuid.UUID(str(data.get("operation_id")))
        offer_id = uuid.UUID(str(data.get("offer_id")))
    except (ValueError, TypeError):
        raise DomainError("invalid_request", "Choose an offer and a valid operation key.") from None
    payload_hash = digest(data)
    existing = Room.objects.filter(operation_id=operation_id).first()
    if existing:
        if existing.payload_hash != payload_hash or actor_id not in {
            existing.lender_id,
            existing.participant_id,
        }:
            raise DomainError("operation_conflict", "This operation key has different input.", 409)
        return existing
    try:
        offer = LendingOffer.objects.select_for_update().select_related("lender").get(pk=offer_id)
    except LendingOffer.DoesNotExist:
        raise DomainError("not_found", "Offer not found.", 404) from None
    # Recheck after the offer lock: a concurrent request may have committed
    # this operation while this request was waiting for the same offer.
    existing = Room.objects.filter(operation_id=operation_id).first()
    if existing:
        if existing.payload_hash != payload_hash or actor_id not in {
            existing.lender_id,
            existing.participant_id,
        }:
            raise DomainError("operation_conflict", "This operation key has different input.", 409)
        return existing
    kind = data.get("kind")
    application = None
    if kind == "borrowing":
        try:
            application_id = uuid.UUID(str(data.get("application_id")))
            application = LoanApplication.objects.select_related("borrower").get(
                pk=application_id, offer=offer
            )
        except (LoanApplication.DoesNotExist, ValueError, TypeError):
            raise DomainError("not_found", "Application not found.", 404) from None
        participant = application.borrower
        if actor_id not in {participant.id, offer.lender_id}:
            raise DomainError("not_found", "Application not found.", 404)
        existing = Room.objects.filter(application=application).first()
        if existing:
            return existing
        if application.status not in {"submitted", "reviewing", "selected"}:
            raise DomainError(
                "application_state", "Only an open application can start a meeting.", 409
            )
        thread = ensure_thread(actor_id=actor_id, application_id=application.id)
        proposal = {
            "amount": application.terms["principal"],
            "terms": application.terms,
            "disclosure": application.disclosure,
        }
    elif kind == "investment":
        if offer.lender_id == actor_id:
            raise DomainError("self_investment", "Choose another person's offer.")
        if offer.status != "published" or offer.expires_at <= timezone.now():
            raise DomainError("offer_unavailable", "This offer no longer accepts pitches.", 409)
        from accounts.models import Member

        participant = Member.objects.get(pk=actor_id)
        existing = Room.objects.filter(
            offer=offer, participant=participant, kind=kind, state="negotiating"
        ).first()
        if existing:
            return existing
        amount = integer(data.get("amount"), "contribution", 10000)
        share = integer(data.get("share_bps"), "interest share")
        if share > 10000:
            raise DomainError("invalid_share", "Choose a share from 0% to 100%.")
        thread = Thread.objects.create(investment_context=uuid.uuid4())
        thread.participants.set([offer.lender, participant])
        proposal = {
            "amount": amount,
            "share_bps": share,
            "basis": "attributed_collected_interest",
            "risk_model": "investor_allocated_loss",
            "fee_policy": None,
        }
    else:
        raise DomainError("invalid_kind", "Choose a borrowing or investment room.")
    active(offer.lender_id)
    room = Room.objects.create(
        kind=kind,
        lender=offer.lender,
        participant=participant,
        offer=offer,
        application=application,
        thread=thread,
        proposal=proposal,
        proposal_hash=digest(proposal),
        operation_id=operation_id,
        payload_hash=payload_hash,
    )
    for member_id in (room.lender_id, room.participant_id):
        Attendance.objects.create(room=room, member_id=member_id)
    event(room, actor_id, "room.created")
    if data.get("message"):
        send_message(
            actor_id=actor_id, thread_id=thread.id, body=data["message"], operation_id=operation_id
        )
    return room


@transaction.atomic
def command(*, actor_id, room_id, data):
    active(actor_id)
    if settings.ENVIRONMENT != "test":
        raise DomainError("test_only", "New agreement-room actions are currently test-only.", 403)
    room = room_for(room_id, actor_id, lock=True)
    try:
        operation_id = uuid.UUID(str(data.get("operation_id")))
    except (ValueError, TypeError):
        raise DomainError("invalid_operation", "A valid operation key is required.") from None
    payload_hash = digest(data)
    previous = RoomCommand.objects.filter(operation_id=operation_id).first()
    if previous:
        if (
            previous.room_id != room.id
            or previous.actor_id != actor_id
            or previous.payload_hash != payload_hash
        ):
            raise DomainError("operation_conflict", "This operation key has different input.", 409)
        return room
    action = data.get("action")
    ephemeral = action in {"heartbeat", "lobby_heartbeat", "leave", "ping", "message", "counter"}
    if not ephemeral and (
        type(data.get("expected_revision")) is not int
        or data.get("expected_revision") != room.revision
    ):
        raise DomainError(
            "room_changed", "The room changed. Review the current terms and try again.", 409
        )
    if room.state == "closed" and action not in {"heartbeat", "lobby_heartbeat", "leave"}:
        raise DomainError(
            "room_closed", "This meeting is closed. Its records remain available.", 409
        )
    lender = actor_id == room.lender_id
    if action in {"schedule", "agenda", "propose", "prepare"} and not lender:
        raise DomainError(
            "lender_action", "The lender publishes the meeting agenda and shared proposals.", 403
        )
    row = room.attendance.get(member_id=actor_id)
    if action == "schedule":
        at = parse_datetime(str(data.get("scheduled_at", "")))
        if (
            not at
            or timezone.is_naive(at)
            or at <= timezone.now() - timedelta(minutes=5)
            or at > timezone.now() + timedelta(days=366)
        ):
            raise DomainError(
                "invalid_schedule", "Choose a meeting time with a timezone, within the next year."
            )
        room.scheduled_at = at
        room.schedule_version += 1
        Attendance.objects.filter(room=room).update(
            schedule_version=0, checked_in_at=None, heartbeat_at=None
        )
        row.schedule_version = room.schedule_version
        row.save(update_fields=["schedule_version", "updated_at"])
    elif action == "accept_schedule":
        if not room.scheduled_at:
            raise DomainError(
                "schedule_first", "The lender must propose a meeting time first.", 409
            )
        row.schedule_version = room.schedule_version
        row.save(update_fields=["schedule_version", "updated_at"])
    elif action == "check_in":
        if (
            not room.scheduled_at
            or room.attendance.filter(schedule_version=room.schedule_version).count() != 2
        ):
            raise DomainError(
                "schedule_first", "Both people must accept the current meeting time.", 409
            )
        if abs((timezone.now() - room.scheduled_at).total_seconds()) > 3600:
            raise DomainError(
                "meeting_window",
                "Check in within one hour of the meeting. Ask the lender to reschedule.",
                409,
            )
        row.checked_in_at = row.heartbeat_at = timezone.now()
        row.save(update_fields=["checked_in_at", "heartbeat_at", "updated_at"])
    elif action == "lobby_heartbeat":
        row.lobby_seen_at = timezone.now()
        row.save(update_fields=["lobby_seen_at", "updated_at"])
        return room
    elif action == "leave":
        row.checked_in_at = row.heartbeat_at = None
        row.lobby_seen_at = timezone.now()
        row.save(update_fields=["checked_in_at", "heartbeat_at", "lobby_seen_at", "updated_at"])
        event(room, actor_id, "attendance.left")
    elif action == "ping":
        last = (
            room.events.filter(actor_id=actor_id, kind="meeting.ping")
            .order_by("-created_at")
            .first()
        )
        if last and last.created_at > timezone.now() - timedelta(seconds=60):
            raise DomainError("ping_cooldown", "Wait one minute before sending another ping.", 429)
        message = send_message(
            actor_id=actor_id,
            thread_id=room.thread_id,
            body="Meeting ping: please check our waiting room.",
            operation_id=operation_id,
        )
        event(
            room,
            actor_id,
            "meeting.ping",
            {
                "message_id": str(message.id),
                "recipient_id": str(room.participant_id if lender else room.lender_id),
            },
        )
    elif action == "heartbeat":
        if row.schedule_version == room.schedule_version and row.checked_in_at:
            row.heartbeat_at = timezone.now()
            row.save(update_fields=["heartbeat_at", "updated_at"])
        return room
    elif action in {"message", "counter"}:
        message = send_message(
            actor_id=actor_id,
            thread_id=room.thread_id,
            body=data.get("body"),
            operation_id=operation_id,
        )
        event(
            room,
            actor_id,
            "proposal.counter" if action == "counter" else "message.sent",
            {"message_id": str(message.id)},
        )
    elif action == "agenda":
        if data.get("agenda") not in {"funding", "earnings", "documents"}:
            raise DomainError("invalid_agenda", "Choose one of the three meeting agendas.")
        room.agenda = data["agenda"]
    elif action == "propose":
        if room.agreement_id:
            raise DomainError(
                "agreement_prepared",
                "This room already has a frozen agreement. Changes need a separate amendment.",
                409,
            )
        amount = integer(data.get("amount"), "amount", 10000)
        if room.kind == "investment":
            share = integer(data.get("share_bps"), "interest share")
            if share > 10000:
                raise DomainError("invalid_share", "Choose a share from 0% to 100%.")
            room.proposal = {**room.proposal, "amount": amount, "share_bps": share}
        else:
            if room.application.status not in {"submitted", "reviewing"}:
                raise DomainError(
                    "application_frozen", "Reserved application terms cannot be edited here.", 409
                )
            from agreements.disclosures import build_disclosure

            terms = terms_for_amount(room.offer, amount)
            room.proposal = {
                "amount": amount,
                "terms": terms.to_dict(),
                "disclosure": build_disclosure(terms),
            }
        room.proposal_version += 1
        room.proposal_hash = digest(room.proposal)
    elif action == "approve":
        require_both(room)
        if data.get("expected_hash") != room.proposal_hash:
            raise DomainError(
                "proposal_changed", "Review the latest proposal before agreeing.", 409
            )
        Approval.objects.get_or_create(
            room=room,
            member_id=actor_id,
            proposal_version=room.proposal_version,
            kind="proposal",
            defaults={"hash": room.proposal_hash},
        )
    elif action == "review_evidence":
        if data.get("expected_hash") != evidence_hash(room):
            raise DomainError(
                "evidence_changed", "The evidence changed. Review the current statuses first.", 409
            )
        if room.evidence.filter(revoked=False).exclude(document__status="clean").exists():
            raise DomainError(
                "evidence_quarantined",
                "Shared files must pass safety review before you acknowledge them.",
                409,
            )
        Approval.objects.update_or_create(
            room=room,
            member_id=actor_id,
            proposal_version=room.proposal_version,
            kind="evidence",
            defaults={"hash": evidence_hash(room)},
        )
    elif action == "prepare":
        require_both(room)
        if not evidence_reviewed(room):
            raise DomainError(
                "evidence_review_required",
                "Both people must review the current evidence statuses before preparing a contract.",
                409,
            )
        if not both_approved(room):
            raise DomainError(
                "approvals_required", "Both people must agree to the current proposal first.", 409
            )
        if room.kind == "investment":
            raise DomainError(
                "investment_policy_pending",
                "Investment contracts and funding are blocked until capital-return and platform-fee policies are approved. No capital has been transferred.",
                409,
            )
        from marketplace.reservations import select_application
        from agreements.acceptance import prepare_agreement

        # Preserve the reservation worker's offer-before-application lock order.
        LendingOffer.objects.select_for_update().get(pk=room.offer_id)
        application = LoanApplication.objects.select_for_update().get(pk=room.application_id)
        if application.status in {"submitted", "reviewing"}:
            application.terms = room.proposal["terms"]
            application.disclosure = room.proposal["disclosure"]
            application.save(update_fields=["terms", "disclosure", "updated_at"])
            reservation = select_application(
                lender_id=room.lender_id,
                application_id=application.id,
                expected_offer_version=room.offer.version,
                operation_id=operation_id,
            )
        elif application.status == "selected" and hasattr(application, "reservation"):
            reservation = application.reservation
            if application.terms != room.proposal["terms"]:
                raise DomainError(
                    "application_changed",
                    "The selected application's terms changed. Reopen review.",
                    409,
                )
        else:
            raise DomainError(
                "application_unavailable", "This application is no longer available.", 409
            )
        room.agreement = prepare_agreement(reservation_id=reservation.id, actor_id=actor_id)
    elif action == "accept_contract":
        require_both(room)
        if not room.agreement_id or data.get("expected_hash") != room.agreement.hash:
            raise DomainError(
                "contract_changed", "Open the current agreement before accepting.", 409
            )
        if data.get("accepted") is not True:
            raise DomainError(
                "acceptance_required", "Confirm your acceptance of this exact test agreement."
            )
        from agreements.acceptance import accept_agreement

        result = accept_agreement(
            member_id=actor_id,
            agreement_id=room.agreement_id,
            expected_hash=data["expected_hash"],
            operation_id=operation_id,
        )
        if result.state == "accepted":
            room.state = "agreed"
        record_audit(actor_id=actor_id, action="room.contract_accepted", subject_id=room.id)
    elif action == "visibility":
        if (
            room.kind != "investment"
            or actor_id != room.participant_id
            or data.get("visibility") not in {"anonymous", "named"}
        ):
            raise DomainError(
                "invalid_visibility", "Only the investor can choose their public appearance.", 403
            )
        room.visibility = data["visibility"]
        # Public appearance is separate from commercial proposal acceptance.
    elif action == "close":
        room.state = "closed"
    else:
        raise DomainError("unsupported_action", "Choose a supported meeting action.")
    if not ephemeral:
        room.revision += 1
        room.save()
        event(room, actor_id, action)
    RoomCommand.objects.create(
        room=room, actor_id=actor_id, operation_id=operation_id, payload_hash=payload_hash
    )
    return room
