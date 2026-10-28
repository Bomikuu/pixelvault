from django.urls import path

from .views import (
    ApplicationDetailView,
    ApplicationsView,
    ApplyView,
    DeclineView,
    OfferDetailView,
    OfferPublishView,
    OffersView,
    SelectView,
    WithdrawView,
)

urlpatterns = [
    path("applications/<uuid:application_id>/decline", DeclineView.as_view()),
    path("offers", OffersView.as_view()),
    path("offers/<uuid:offer_id>", OfferDetailView.as_view()),
    path("offers/<uuid:offer_id>/publish", OfferPublishView.as_view()),
    path("offers/<uuid:offer_id>/applications", ApplyView.as_view()),
    path("applications", ApplicationsView.as_view()),
    path("applications/<uuid:application_id>", ApplicationDetailView.as_view()),
    path("applications/<uuid:application_id>/select", SelectView.as_view()),
    path("applications/<uuid:application_id>/withdraw", WithdrawView.as_view()),
]
