from community.activity import EventStreamRenderer
from config.views import MemberView
from django.http import StreamingHttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from . import presence, projections, bubbles, moderation
from .serializers import JoinInput, CommandInput, ReportInput, DecisionInput
from .stream import room_events


def private(data, status=200):
    response = Response(data, status=status)
    response["Cache-Control"] = "private, no-store"
    return response


def validated(cls, data):
    serializer = cls(data=data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def owner(request, slug):
    return {"actor_id": request.user.pk, "session_key": request.session.session_key, "room_slug": slug}


class RoomsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return private(projections.summaries())


class JoinView(MemberView):
    def post(self, request, slug):
        data = validated(JoinInput, request.data)
        result = presence.join(**owner(request, slug), **data)
        return private({"lease": result["membership"]["lease"], "snapshot": projections.snapshot(**owner(request, slug), instance_id=data["instance_id"])})


class SnapshotView(MemberView):
    def get(self, request, slug):
        return private(projections.snapshot(**owner(request, slug), instance_id=request.headers.get("X-Plaza-Instance")))


class CommandView(MemberView):
    # The store applies a distinct atomic movement/post limit. Ordinary hourly
    # user throttling is unsuitable for continuous movement, never frame polling.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "plaza_command"

    def post(self, request, slug):
        data = validated(CommandInput, request.data)
        action = data.pop("action")
        if action == "bubble":
            offer_id = data.pop("offer_id", None)
            bubbles.publish_bubble(**owner(request, slug), **data, offer_id=offer_id)
            return private({"recorded": True})
        if action == "clear_bubble":
            bubbles.clear_bubble(**owner(request, slug), **data)
            return private({"recorded": True})
        result = presence.control(**owner(request, slug), **data, action=action)
        if action == "leave":
            return private({"recorded": True})
        return private({"recorded": True, "trajectory": result["membership"]["trajectory"], "server_time_ms": result["server_time_ms"]})


class StreamView(MemberView):
    renderer_classes = (EventStreamRenderer, JSONRenderer)

    def get(self, request, slug):
        presence.room_state(**owner(request, slug))
        response = StreamingHttpResponse(room_events(**owner(request, slug)), content_type="text/event-stream")
        response["Cache-Control"] = "private, no-store, no-transform"
        response["X-Accel-Buffering"] = "no"
        return response


class ReportView(MemberView):
    def post(self, request, bubble_id):
        report = moderation.report_bubble(actor_id=request.user.pk, session_key=request.session.session_key, bubble_id=bubble_id, **validated(ReportInput, request.data))
        return private({"id": str(report.id), "status": report.status}, 201)


class ModerationQueueView(MemberView):
    def get(self, request):
        return private(moderation.moderation_queue(request.user.pk))


class DecisionView(MemberView):
    def post(self, request, bubble_id):
        b = moderation.moderate_bubble(actor_id=request.user.pk, bubble_id=bubble_id, **validated(DecisionInput, request.data))
        return private({"id": str(b.id), "status": b.status, "version": b.version})
