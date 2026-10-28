from django.urls import path

from .views import (
    CalculatorView,
    CommentDetailView,
    CommentView,
    LikeView,
    ModerationQueueView,
    ModerationView,
    ReactionView,
    ReportView,
    SocialView,
)

urlpatterns = [
    path("engagement/offers/<uuid:offer_id>", SocialView.as_view()),
    path("engagement/offers/<uuid:offer_id>/like", LikeView.as_view()),
    path("engagement/offers/<uuid:offer_id>/reaction", ReactionView.as_view()),
    path("engagement/offers/<uuid:offer_id>/comments", CommentView.as_view()),
    path("engagement/offers/<uuid:offer_id>/calculator", CalculatorView.as_view()),
    path("engagement/comments/<uuid:comment_id>", CommentDetailView.as_view()),
    path("engagement/comments/<uuid:comment_id>/report", ReportView.as_view()),
    path("admin/offer-comments", ModerationQueueView.as_view()),
    path("admin/offer-comments/<uuid:comment_id>/review", ModerationView.as_view()),
]
