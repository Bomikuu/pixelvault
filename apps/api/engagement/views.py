import uuid

from accounts.permissions import require_staff
from config.errors import DomainError
from config.views import MemberView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .calculator import preview_offer
from .models import OfferComment
from .services import (
    active_member,
    comment_data,
    delete_comment,
    moderate_comment,
    report_comment,
    set_like,
    set_reaction,
    social_summary,
    submit_comment,
)


class WriteThrottle(UserRateThrottle):
    scope = "engagement_write"
    rate = "30/min"


class CommentThrottle(UserRateThrottle):
    scope = "engagement_comment"
    rate = "6/min"


class PreviewThrottle(UserRateThrottle):
    scope = "engagement_preview"
    rate = "60/min"


def actor_id(request):
    return request.user.id if request.user.is_authenticated else None


def strict_fields(data, allowed, required=()):
    if set(data) - set(allowed) or set(required) - set(data):
        raise DomainError("invalid_fields", "Provide only the fields required for this action.")


def private_response(data, status=200):
    response = Response(data, status=status)
    response["Cache-Control"] = "private, no-store"
    return response


class SocialView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, offer_id):
        strict_fields(request.query_params, {"cursor"})
        try:
            cursor = int(request.query_params.get("cursor", "0"))
            if not 0 <= cursor <= 10000:
                raise ValueError
        except (ValueError, TypeError):
            raise DomainError("invalid_cursor", "Choose a valid comment page.") from None
        return private_response(
            social_summary(offer_id=offer_id, actor_id=actor_id(request), cursor=cursor)
        )


class LikeView(MemberView):
    throttle_classes = [WriteThrottle]

    def put(self, request, offer_id):
        strict_fields(request.data, {"liked"}, {"liked"})
        return private_response(
            set_like(actor_id=request.user.id, offer_id=offer_id, liked=request.data["liked"])
        )


class ReactionView(MemberView):
    throttle_classes = [WriteThrottle]

    def put(self, request, offer_id):
        strict_fields(request.data, {"award_id"}, {"award_id"})
        set_reaction(actor_id=request.user.id, offer_id=offer_id, award_id=request.data["award_id"])
        return private_response(social_summary(offer_id=offer_id, actor_id=request.user.id))


class CommentView(MemberView):
    throttle_classes = [CommentThrottle]

    def post(self, request, offer_id):
        strict_fields(request.data, {"body", "operation_id"}, {"body", "operation_id"})
        try:
            operation = uuid.UUID(str(request.data["operation_id"]))
        except (ValueError, TypeError):
            raise DomainError(
                "invalid_operation", "Provide a valid operation identifier."
            ) from None
        comment = submit_comment(
            actor_id=request.user.id,
            offer_id=offer_id,
            body=request.data["body"],
            operation_id=operation,
        )
        return private_response(comment_data(comment, request.user.id), status=201)


class CommentDetailView(MemberView):
    throttle_classes = [WriteThrottle]

    def delete(self, request, comment_id):
        delete_comment(actor_id=request.user.id, comment_id=comment_id)
        return private_response({"deleted": True})


class ReportView(MemberView):
    throttle_classes = [CommentThrottle]

    def post(self, request, comment_id):
        strict_fields(request.data, {"reason"}, {"reason"})
        report = report_comment(
            actor_id=request.user.id, comment_id=comment_id, reason=request.data["reason"]
        )
        return private_response({"id": str(report.id), "status": "submitted"}, status=201)


class CalculatorView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PreviewThrottle]

    def get(self, request, offer_id):
        strict_fields(
            request.query_params, {"principal", "installment_count", "frequency"}, {"principal"}
        )
        try:
            principal = int(request.query_params["principal"])
            count = (
                int(request.query_params["installment_count"])
                if "installment_count" in request.query_params
                else None
            )
        except (ValueError, TypeError):
            raise DomainError(
                "invalid_preview", "Use whole centavos and a whole installment count."
            ) from None
        return private_response(
            preview_offer(
                offer_id=offer_id,
                actor_id=actor_id(request),
                principal=principal,
                installment_count=count,
                frequency=request.query_params.get("frequency"),
            )
        )


class ModerationQueueView(MemberView):
    def get(self, request):
        actor = active_member(request.user.id)
        require_staff(actor, {"moderator"}, sensitive=True)
        query = (
            OfferComment.objects.exclude(status="deleted")
            .select_related("author", "offer")
            .prefetch_related("reports")
            .order_by("created_at")
        )
        if request.query_params.get("offer_id"):
            try:
                query = query.filter(offer_id=uuid.UUID(request.query_params["offer_id"]))
            except (ValueError, TypeError):
                raise DomainError("invalid_offer", "Choose a valid offer.") from None
        return private_response(
            {
                "comments": [
                    {
                        **comment_data(row),
                        "offer_id": str(row.offer_id),
                        "version": row.version,
                        "reports": [
                            {"id": str(report.id), "reason": report.reason}
                            for report in row.reports.all()
                        ],
                    }
                    for row in query[:100]
                ]
            }
        )


class ModerationView(MemberView):
    throttle_classes = [WriteThrottle]

    def post(self, request, comment_id):
        strict_fields(
            request.data,
            {"decision", "expected_version", "reason"},
            {"decision", "expected_version", "reason"},
        )
        row = moderate_comment(
            actor_id=request.user.id,
            comment_id=comment_id,
            expected_version=request.data["expected_version"],
            decision=request.data["decision"],
            reason=request.data["reason"],
        )
        return private_response({**comment_data(row, request.user.id), "version": row.version})
