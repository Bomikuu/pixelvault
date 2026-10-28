from django.urls import path

from .views import AcceptView, AgreementsView, AgreementView, DocumentView, RenewEffectiveDateView

urlpatterns = [
    path("loans/<uuid:loan_id>/renew-effective-date", RenewEffectiveDateView.as_view()),
    path("agreements", AgreementsView.as_view()),
    path("agreements/<uuid:agreement_id>", AgreementView.as_view()),
    path("agreements/<uuid:agreement_id>/accept", AcceptView.as_view()),
    path("agreements/<uuid:agreement_id>/document", DocumentView.as_view()),
]
