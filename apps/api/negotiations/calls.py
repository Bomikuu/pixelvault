"""Participant-only, short-lived WebRTC negotiation. No media is recorded."""

import base64
import hashlib
import hmac
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from config.errors import DomainError
from config.views import MemberView
from .models import RoomCall
from .services import active, current_attendance, room_for


class CallThrottle(UserRateThrottle):
    rate = "120/min"
    scope = "room_call"


def expired(call):
    now = timezone.now()
    if call.state == "ringing":
        return call.created_at < now - timedelta(seconds=60)
    return (
        call.created_at < now - timedelta(hours=2)
        or call.caller_seen_at < now - timedelta(seconds=45)
        or not call.callee_seen_at
        or call.callee_seen_at < now - timedelta(seconds=45)
    )


def end(call):
    call.state, call.ended_at = "ended", timezone.now()
    call.offer = call.answer = None
    call.save(update_fields=["state", "ended_at", "offer", "answer", "updated_at"])


def ice_servers(actor_id):
    # coturn REST-style credentials expire after ten minutes; never expose the shared secret.
    urls = settings.WEBRTC_TURN_URLS
    if not urls or not settings.WEBRTC_TURN_SECRET:
        return []
    username = f"{int(timezone.now().timestamp()) + 600}:{actor_id}"
    credential = base64.b64encode(
        hmac.new(settings.WEBRTC_TURN_SECRET.encode(), username.encode(), hashlib.sha1).digest()
    ).decode()
    return [{"urls": urls, "username": username, "credential": credential}]


def projection(room, actor_id):
    call = room.calls.order_by("-created_at").first()
    data = None
    if call:
        state = (
            "ended"
            if call.state == "ended"
            or expired(call)
            or room.state == "closed"
            or len(current_attendance(room)) != 2
            else call.state
        )
        data = {
            "id": str(call.id),
            "caller_id": str(call.caller_id),
            "state": state,
            "offer": call.offer if state == "active" else None,
            "answer": call.answer if state == "active" else None,
        }
    return {
        "available": settings.WEBRTC_ENABLED,
        "relay_configured": bool(settings.WEBRTC_TURN_URLS and settings.WEBRTC_TURN_SECRET),
        "ice_servers": ice_servers(actor_id) if data and data["state"] == "active" else [],
        "call": data,
        "note": "Both people choose whether to join. Leaving or hiding this tab ends the call. No recording.",
    }


class RoomCallView(MemberView):
    throttle_classes = [CallThrottle]

    def get(self, request, room_id):
        room = room_for(room_id, request.user.id)
        response = Response(projection(room, request.user.id))
        response["Cache-Control"] = "private, no-store"
        return response

    @transaction.atomic
    def post(self, request, room_id):
        active(request.user.id)
        room = room_for(room_id, request.user.id, lock=True)
        if not settings.WEBRTC_ENABLED:
            raise DomainError(
                "calls_unavailable", "Private calls are not enabled by the operator.", 409
            )
        action = request.data.get("action")
        call = room.calls.filter(state__in=["ringing", "active"]).first()
        if call and (expired(call) or room.state == "closed" or len(current_attendance(room)) != 2):
            end(call)
            call = None
        if action == "invite":
            if room.state == "closed" or len(current_attendance(room)) != 2:
                raise DomainError(
                    "both_required",
                    "Both people must enter and be present in the meeting first.",
                    409,
                )
            if call:
                raise DomainError(
                    "call_in_progress",
                    "A call is already open. Join it or wait for it to end.",
                    409,
                )
            RoomCall.objects.create(room=room, caller=request.user, caller_seen_at=timezone.now())
        elif action in {"accept", "decline", "end", "heartbeat", "description"}:
            if not call or str(call.id) != str(request.data.get("call_id")):
                if action in {"end", "heartbeat"}:
                    response = Response(projection(room, request.user.id))
                    response["Cache-Control"] = "private, no-store"
                    return response
                raise DomainError(
                    "call_expired",
                    "This call has ended. Start another when both people are ready.",
                    409,
                )
            caller = call.caller_id == request.user.id
            if action == "accept":
                if (
                    caller
                    or call.state != "ringing"
                    or room.state == "closed"
                    or len(current_attendance(room)) != 2
                ):
                    raise DomainError(
                        "call_changed", "This invitation cannot be accepted now.", 409
                    )
                call.state = "active"
                call.callee_seen_at = timezone.now()
                call.save(update_fields=["state", "callee_seen_at", "updated_at"])
            elif action in {"decline", "end"}:
                end(call)
            else:
                if call.state == "active" and (
                    room.state == "closed" or request.user.id not in current_attendance(room)
                ):
                    end(call)
                else:
                    field = "caller_seen_at" if caller else "callee_seen_at"
                    setattr(call, field, timezone.now())
                    if action == "description":
                        value = request.data.get("description")
                        expected = "offer" if caller else "answer"
                        if (
                            call.state != "active"
                            or not isinstance(value, dict)
                            or set(value) != {"type", "sdp"}
                            or value.get("type") != expected
                            or not isinstance(value.get("sdp"), str)
                            or not 1 <= len(value["sdp"]) <= 65536
                        ):
                            raise DomainError(
                                "invalid_description", "Send a valid negotiated call description."
                            )
                        if expected == "answer" and not call.offer:
                            raise DomainError(
                                "offer_pending", "Wait for the caller’s connection offer.", 409
                            )
                        existing = getattr(call, expected)
                        if existing and existing != value:
                            raise DomainError(
                                "description_frozen",
                                "Restart the call to negotiate a new connection.",
                                409,
                            )
                        setattr(call, expected, value)
                    call.save()
        else:
            raise DomainError("invalid_call_action", "Choose a supported call action.")
        response = Response(projection(room, request.user.id))
        response["Cache-Control"] = "private, no-store"
        return response


def prune_calls():
    for call in RoomCall.objects.filter(state__in=["ringing", "active"]).iterator():
        if expired(call):
            # A conditional update cannot overwrite an already ended call's state.
            RoomCall.objects.filter(pk=call.id, updated_at=call.updated_at).update(
                state="ended", offer=None, answer=None, ended_at=timezone.now()
            )
