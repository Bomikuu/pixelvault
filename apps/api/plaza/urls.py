from django.urls import path
from .views import RoomsView, JoinView, SnapshotView, CommandView, StreamView, ReportView, ModerationQueueView, DecisionView

urlpatterns = [
    path("plaza/rooms", RoomsView.as_view()),
    path("plaza/rooms/<slug:slug>/join", JoinView.as_view()),
    path("plaza/rooms/<slug:slug>", SnapshotView.as_view()),
    path("plaza/rooms/<slug:slug>/commands", CommandView.as_view()),
    path("plaza/rooms/<slug:slug>/stream", StreamView.as_view()),
    path("plaza/bubbles/<uuid:bubble_id>/reports", ReportView.as_view()),
    path("admin/plaza/bubbles", ModerationQueueView.as_view()),
    path("admin/plaza/bubbles/<uuid:bubble_id>/decision", DecisionView.as_view()),
]
