from rest_framework import serializers


class MessageInput(serializers.Serializer):
    body = serializers.CharField(max_length=4000, trim_whitespace=True)
    operation_id = serializers.UUIDField()


class ReviewInput(serializers.Serializer):
    loan_id = serializers.UUIDField()
    ratings = serializers.DictField(child=serializers.IntegerField(min_value=1, max_value=5))
    body = serializers.CharField(max_length=2000, allow_blank=True, required=False, default="")
    operation_id = serializers.UUIDField()
    recommendation = serializers.ChoiceField(
        choices=("up", "down"), allow_null=True, required=False, default=None
    )


class ModerationInput(serializers.Serializer):
    expected_version = serializers.IntegerField(min_value=1)
    decision = serializers.ChoiceField(
        choices=["approved", "held", "rejected", "response_approved", "response_rejected"]
    )
    reason = serializers.CharField(max_length=2000)
    content_type = serializers.ChoiceField(choices=["review", "contribution"], default="review")


def message_data(message):
    return {
        "id": str(message.id),
        "sender_id": str(message.sender_id),
        "body": message.body,
        "created_at": message.created_at.isoformat(),
    }


def review_data(review, public=False):
    return {
        "id": str(review.id),
        "loan_id": str(review.loan_id),
        "ratings": review.ratings,
        "body": review.body,
        "recommendation": review.recommendation,
        "status": review.status,
        "version": review.version,
        "published_at": review.published_at.isoformat() if review.published_at else None,
        "response": review.response,
        "response_status": review.response_status,
    }
