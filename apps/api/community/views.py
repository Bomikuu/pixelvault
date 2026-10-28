from config.errors import DomainError
from config.views import MemberView
from django.db import transaction
from django.db.models import Max
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .awards import evaluate_awards
from .locations import AREAS, coarse_area
from .messaging import clean_text, ensure_thread, report_content, send_message, thread_for
from .models import Award, ContentReport, Contribution, Review, Thread
from .permissions import member_for, staff_for
from .profiles import (
    achievement_catalog,
    award_data,
    community_level,
    public_identity,
    public_profile,
    update_profile,
)
from .reviews import appeal_review, moderate_content, respond_review, submit_review
from .search import search_offers
from .serializers import MessageInput, ModerationInput, ReviewInput, message_data, review_data


def validated(serializer_class, data):
    serializer = serializer_class(data=data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class AreasView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response(
            {
                "areas": [coarse_area(area_code=name) for name in AREAS],
                "map_source": "synthetic-area-centroids",
            }
        )


class DiscoveryView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        response = Response(
            search_offers(
                viewer_id=request.user.pk if request.user.is_authenticated else None,
                filters=request.query_params.dict(),
            )
        )

        response["Cache-Control"] = "private, no-store"
        return response


class PublicProfileView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, handle):
        return Response(
            public_profile(
                handle=handle, viewer_id=request.user.pk if request.user.is_authenticated else None
            )
        )


class ProfileView(MemberView):
    def get(self, request):
        return Response(self.own_data(request.user))

    @staticmethod
    def own_data(member, data=None):
        from accounts.profile import own_profile_details

        from .reputation import reputation_summary, xp_progress

        data = data if data is not None else public_profile(handle=member.username)
        return {
            **data,
            **own_profile_details(member),
            "reputation": reputation_summary(member, own=True),
            "xp_progress": xp_progress(member, own=True),
        }

    @transaction.atomic
    def patch(self, request):
        data = update_profile(actor_id=request.user.id, data=request.data)
        member = member_for(request.user.id)
        return Response(self.own_data(member, data))


class AchievementCatalogView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({"catalog": achievement_catalog()})


class ReputationView(MemberView):
    def get(self, request):
        from .reputation import reputation_details

        return Response(reputation_details(member=request.user))


class LeaderboardView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        from .reputation import leaderboard

        return Response(
            leaderboard(
                limit=request.query_params.get("limit", 25),
                cursor=request.query_params.get("cursor"),
            )
        )


class AwardsView(MemberView):
    def get(self, request):
        settings = getattr(request.user, "community_settings", None)
        selected = settings.public_award_ids if settings else []
        awards = [
            {**award_data(award), "public": str(award.id) in selected}
            for award in Award.objects.filter(member=request.user)
        ]
        return Response(
            {
                "awards": awards,
                "community_level": community_level(request.user),
                "catalog": achievement_catalog(),
            }
        )

    def post(self, request):
        evaluation = evaluate_awards(member_id=request.user.id)
        response = self.get(request)
        response.data.update(evaluation)
        return response


class ThreadView(MemberView):
    def get(self, request):
        threads = (
            Thread.objects.filter(participants=request.user)
            .annotate(latest_at=Max("messages__created_at"))
            .prefetch_related("participants")
            .order_by("-created_at")
        )
        rows = []
        for thread in threads:
            other = next(
                (member for member in thread.participants.all() if member.id != request.user.id),
                None,
            )
            identity = public_identity(other) if other else {}
            rows.append(
                {
                    "id": str(thread.id),
                    "meeting_id": str(thread.room.id) if hasattr(thread, "room") else None,
                    "loan_id": str(thread.loan_id) if thread.loan_id else None,
                    "application_id": str(thread.application_id) if thread.application_id else None,
                    "other_display_name": identity.get("display_name", ""),
                    "other_handle": identity.get("handle", ""),
                    "other_avatar_key": other.avatar_key if other else "",
                    "other_photo_url": identity.get("photo_url") if other else None,
                    "other_reputation": identity.get("reputation") if other else None,
                    "latest_at": thread.latest_at.isoformat() if thread.latest_at else None,
                }
            )
        return Response({"threads": rows})

    def post(self, request):
        class ThreadInput(serializers.Serializer):
            loan_id = serializers.UUIDField(required=False)
            application_id = serializers.UUIDField(required=False)

        data = validated(ThreadInput, request.data)
        thread = ensure_thread(actor_id=request.user.id, **data)
        return Response(
            {
                "id": str(thread.id),
                "loan_id": str(thread.loan_id) if thread.loan_id else None,
                "application_id": str(thread.application_id) if thread.application_id else None,
            },
            status=201,
        )


class MessagesView(MemberView):
    def get(self, request, thread_id):
        thread = thread_for(actor_id=request.user.id, thread_id=thread_id)
        try:
            offset = int(request.query_params.get("cursor", "0"))
            if not 0 <= offset <= 100000:
                raise ValueError
        except ValueError:
            raise DomainError("invalid_cursor", "Use the provided page cursor.")
        messages = list(thread.messages.order_by("-created_at")[offset : offset + 51])
        return Response(
            {
                "messages": [message_data(message) for message in reversed(messages[:50])],
                "next_cursor": str(offset + 50) if len(messages) > 50 else None,
            }
        )

    def post(self, request, thread_id):
        message = send_message(
            actor_id=request.user.id, thread_id=thread_id, **validated(MessageInput, request.data)
        )
        return Response(message_data(message), status=201)


class ReviewsView(MemberView):
    def post(self, request):
        review = submit_review(actor_id=request.user.id, **validated(ReviewInput, request.data))
        return Response(review_data(review), status=201)

    def get(self, request):
        return Response(
            {
                "reviews": [
                    review_data(review)
                    for review in Review.objects.filter(author=request.user).order_by("-created_at")
                ]
            }
        )


class ReviewResponseView(MemberView):
    def post(self, request, review_id):
        return Response(
            review_data(
                respond_review(
                    actor_id=request.user.id, review_id=review_id, body=request.data.get("body", "")
                )
            )
        )


class ReviewAppealView(MemberView):
    def post(self, request, review_id):
        appeal = appeal_review(
            actor_id=request.user.id, review_id=review_id, reason=request.data.get("reason", "")
        )
        return Response({"id": str(appeal.id), "status": appeal.status}, status=201)


class ReportView(MemberView):
    def post(self, request):
        class ReportInput(serializers.Serializer):
            content_type = serializers.ChoiceField(choices=["review", "message"])
            content_id = serializers.UUIDField()
            reason = serializers.CharField(max_length=2000)

        report = report_content(actor_id=request.user.id, **validated(ReportInput, request.data))
        return Response({"id": str(report.id), "status": report.status}, status=201)


class ContributionsView(MemberView):
    def get(self, request):
        return Response(
            {
                "contributions": [
                    {
                        "id": str(row.id),
                        "title": row.title,
                        "body": row.body,
                        "status": row.status,
                        "version": row.version,
                    }
                    for row in Contribution.objects.filter(member=request.user).order_by(
                        "-created_at"
                    )
                ]
            }
        )

    @transaction.atomic
    def post(self, request):
        member = member_for(request.user.id)
        type(member).objects.select_for_update().get(pk=member.id)
        title = clean_text(request.data.get("title", ""), 120)
        body = clean_text(request.data.get("body", ""), 4000)
        canonical = " ".join(body.lower().split())
        if any(
            " ".join(existing.lower().split()) == canonical
            for existing in Contribution.objects.filter(member=member).values_list(
                "body", flat=True
            )
        ):
            raise DomainError(
                "duplicate_contribution",
                "This educational contribution was already submitted.",
                409,
            )
        row = Contribution.objects.create(member=member, title=title, body=body)
        return Response(
            {"id": str(row.id), "status": row.status, "version": row.version}, status=201
        )


class ModerationQueueView(MemberView):
    def get(self, request):
        staff_for(request.user.id, ("moderator",))
        reviews = (
            Review.objects.filter(status__in=["pending", "held"])
            .exclude(author=request.user)
            .order_by("created_at")[:100]
        )
        contributions = (
            Contribution.objects.filter(status="pending")
            .exclude(member=request.user)
            .order_by("created_at")[:100]
        )
        return Response(
            {
                "reviews": [review_data(row) for row in reviews],
                "contributions": [
                    {
                        "id": str(row.id),
                        "title": row.title,
                        "body": row.body,
                        "status": row.status,
                        "version": row.version,
                    }
                    for row in contributions
                ],
                "reports": [
                    {
                        "id": str(row.id),
                        "content_type": row.content_type,
                        "content_id": str(row.content_id),
                        "reason": row.reason,
                    }
                    for row in ContentReport.objects.filter(status="open")[:100]
                ],
            }
        )


class ModerationDecisionView(MemberView):
    def post(self, request, content_id):
        data = validated(ModerationInput, request.data)
        record = moderate_content(actor_id=request.user.id, content_id=content_id, **data)
        return Response({"id": str(record.id), "status": record.status, "version": record.version})


class AchievementHoldsView(MemberView):
    def get(self, request):
        from .models import AchievementHold

        staff_for(request.user.id, ())
        return Response(
            {
                "holds": [
                    {
                        "id": str(row.id),
                        "member_id": str(row.member_id),
                        "reason": row.reason,
                        "created_at": row.created_at.isoformat(),
                    }
                    for row in AchievementHold.objects.filter(resolved=False).order_by(
                        "created_at"
                    )[:100]
                ]
            }
        )


class AchievementHoldResolutionView(MemberView):
    @transaction.atomic
    def post(self, request, hold_id):
        from audit.services import record_audit

        from .models import AchievementHold

        staff_for(request.user.id, ())
        reason = clean_text(request.data.get("reason", ""), 2000)
        try:
            hold = AchievementHold.objects.select_for_update().get(pk=hold_id)
        except AchievementHold.DoesNotExist:
            raise DomainError("not_found", "Record not found.", 404)
        if hold.member_id == request.user.id:
            raise DomainError("self_review", "An independent reviewer is required.", 403)
        if not hold.resolved:
            hold.resolved = True
            hold.save(update_fields=["resolved", "updated_at"])
            record_audit(
                actor_id=request.user.id,
                action="achievement_hold_resolved",
                subject_id=hold.id,
                reason=reason,
            )
            from audit.outbox import enqueue_event

            enqueue_event(
                kind="awards.evaluate",
                subject_id=hold.member_id,
                payload={"rule_version": "v1"},
                dedupe_key=f"awards:hold-resolved:{hold.id}",
            )
        return Response({"id": str(hold.id), "resolved": hold.resolved})


class RepaymentSummaryView(MemberView):
    def get(self, request, member_id):
        from .reputation import repayment_summary

        return Response(
            repayment_summary(
                actor_id=request.user.id,
                member_id=member_id,
                purpose=request.query_params.get(
                    "purpose",
                    "own_dashboard" if member_id == request.user.id else "existing_relationship",
                ),
            )
        )
