from django.urls import path
from .views import (
    ActionsView,
    CalendarView,
    CalendarExportView,
    DecisionsView,
    SavedOffersView,
    SavedOfferView,
    ThreadReadView,
)

urlpatterns = [
    path("hub/actions", ActionsView.as_view()),
    path("hub/calendar", CalendarView.as_view()),
    path("hub/calendar/export", CalendarExportView.as_view()),
    path("hub/decisions", DecisionsView.as_view()),
    path("hub/saved-offers", SavedOffersView.as_view()),
    path("hub/saved-offers/<uuid:offer_id>", SavedOfferView.as_view()),
    path("hub/threads/<uuid:thread_id>/read", ThreadReadView.as_view()),
]
