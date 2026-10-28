from django.urls import path
from .views import EvidenceContentView, EvidenceView, RoomsView, RoomStreamView, RoomView

urlpatterns = [
    path("meetings", RoomsView.as_view()),
    path("meetings/<uuid:room_id>", RoomView.as_view()),
    path("meetings/<uuid:room_id>/stream", RoomStreamView.as_view()),
    path("meetings/<uuid:room_id>/evidence", EvidenceView.as_view()),
    path("meetings/<uuid:room_id>/evidence/<uuid:evidence_id>", EvidenceContentView.as_view()),
]
