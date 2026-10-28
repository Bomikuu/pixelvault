import json
import time
import uuid

from community.activity import EventStreamRenderer
from config.errors import DomainError
from config.views import MemberView
from django.contrib.sessions.models import Session
from django.db import close_old_connections, transaction
from django.http import HttpResponse, StreamingHttpResponse
from django.utils import timezone
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from .models import Evidence, Room
from .projections import snapshot, summary
from .services import active, command, create_room, event, room_for


def private(data, status=200):
    response = Response(data, status=status)
    response["Cache-Control"] = "private, no-store"
    return response


class RoomsView(MemberView):
    def get(self, request):
        from django.db.models import Q

        rooms = (
            Room.objects.filter(Q(lender=request.user) | Q(participant=request.user))
            .select_related("offer", "lender", "participant")
            .order_by("-updated_at")[:100]
        )
        return private({"rooms": [summary(room) for room in rooms], "limit": 100})

    def post(self, request):
        room = create_room(actor_id=request.user.id, data=request.data)
        return private({"id": str(room.id)}, 201)


class RoomView(MemberView):
    def get(self, request, room_id):
        return private(snapshot(room_for(room_id, request.user.id), request.user.id))

    def post(self, request, room_id):
        room = command(actor_id=request.user.id, room_id=room_id, data=request.data)
        return private(snapshot(room, request.user.id))


class RoomStreamView(MemberView):
    renderer_classes = (EventStreamRenderer, JSONRenderer)

    def get(self, request, room_id):
        room_for(room_id, request.user.id)
        actor_id, session_key = request.user.id, request.session.session_key

        def stream():
            started, sequence = time.monotonic(), None
            try:
                yield "retry: 3000\n\n"
                while time.monotonic() - started < 45:
                    close_old_connections()
                    if not Session.objects.filter(
                        session_key=session_key, expire_date__gt=timezone.now()
                    ).exists():
                        yield "event: room.expired\ndata: {}\n\n"
                        return
                    from accounts.models import Member

                    if not Member.objects.filter(
                        pk=actor_id, is_active=True, suspended=False
                    ).exists():
                        return
                    room = room_for(room_id, actor_id)
                    if room.event_sequence != sequence:
                        sequence = room.event_sequence
                        yield f"id: {sequence}\nevent: room.changed\ndata: {json.dumps({'sequence': sequence, 'revision': room.revision})}\n\n"
                    else:
                        yield ": heartbeat\n\n"
                    time.sleep(2)
            finally:
                close_old_connections()

        response = StreamingHttpResponse(stream(), content_type="text/event-stream")
        response["Cache-Control"] = "private, no-store, no-transform"
        response["X-Accel-Buffering"] = "no"
        return response


class EvidenceView(MemberView):
    @transaction.atomic
    def post(self, request, room_id):
        active(request.user.id)
        from django.conf import settings

        if settings.ENVIRONMENT != "test":
            raise DomainError("test_only", "Room evidence is currently test-only.", 403)
        room = room_for(room_id, request.user.id, lock=True)
        if room.state == "closed":
            raise DomainError("room_closed", "This room is closed.", 409)
        if request.data.get("consent") != "share_with_counterparty":
            raise DomainError(
                "consent_required",
                "Explicitly agree to share this file with this room's other participant.",
            )
        category = request.data.get("category")
        if category not in {"redacted_evidence", "transfer_proof"}:
            raise DomainError("invalid_category", "Choose redacted evidence or transfer proof.")
        uploaded = request.FILES.get("file")
        if not uploaded:
            raise DomainError("file_required", "Choose a PDF, PNG or JPEG file.")
        from documents.services import upload_document

        document = upload_document(owner=request.user, uploaded=uploaded, purpose="room_evidence")
        evidence = Evidence.objects.create(
            room=room, owner=request.user, document=document, category=category
        )
        event(room, request.user.id, "evidence.shared", {"evidence_id": str(evidence.id)})
        return private({"id": str(evidence.id), "status": document.status}, 201)


class EvidenceContentView(MemberView):
    def get(self, request, room_id, evidence_id):
        room = room_for(room_id, request.user.id)
        try:
            evidence = Evidence.objects.select_related("document").get(
                pk=evidence_id, room=room, revoked=False
            )
        except Evidence.DoesNotExist:
            raise DomainError("not_found", "Shared evidence is unavailable.", 404) from None
        if evidence.document.status != "clean":
            raise DomainError(
                "file_quarantined",
                "This file has not passed its safety review. An upload does not verify authenticity.",
                409,
            )
        from django.conf import settings

        if settings.ENVIRONMENT != "test":
            raise DomainError(
                "test_only", "Room evidence is currently available in test mode only.", 403
            )
        from documents.storage import read_private
        from audit.services import record_audit

        record_audit(actor_id=request.user.id, action="room.evidence_read", subject_id=evidence.id)
        response = HttpResponse(
            read_private(evidence.document.storage_key), content_type=evidence.document.content_type
        )
        response["Cache-Control"] = "private, no-store"
        response["Content-Disposition"] = 'attachment; filename="room-evidence"'
        response["X-Content-Type-Options"] = "nosniff"
        return response

    @transaction.atomic
    def delete(self, request, room_id, evidence_id):
        active(request.user.id)
        room = room_for(room_id, request.user.id, lock=True)
        try:
            evidence = Evidence.objects.get(pk=evidence_id, room=room, owner=request.user)
        except Evidence.DoesNotExist:
            raise DomainError("not_found", "Shared evidence is unavailable.", 404) from None
        evidence.revoked = True
        evidence.save(update_fields=["revoked", "updated_at"])
        event(room, request.user.id, "evidence.revoked")
        return private({"revoked": True})
