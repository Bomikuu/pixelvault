from django.urls import path

from .views import InvitationActionView, InvitationClaimView, InvitationsView

urlpatterns = [
    path("connections/co-borrowers", InvitationsView.as_view()),
    path("connections/co-borrowers/<uuid:invitation_id>/action", InvitationActionView.as_view()),
    path("connections/co-borrowers/invite/<str:token>", InvitationClaimView.as_view()),
]
