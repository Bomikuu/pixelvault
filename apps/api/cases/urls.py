from django.urls import path

from .views import (
    AdminCaseDetailView,
    AmendmentAcceptanceView,
    AmendmentsView,
    AmendmentWithdrawalView,
    AssignCaseView,
    CaseDecisionView,
    CaseDetailView,
    CaseQueueView,
    CaseResponseView,
    CasesView,
    LegalRemedyView,
    NoticesView,
)

urlpatterns = [
    path("admin/cases/<uuid:case_id>", AdminCaseDetailView.as_view()),
    path("cases/amendments/<uuid:proposal_id>/withdraw", AmendmentWithdrawalView.as_view()),
    path("cases", CasesView.as_view()),
    path("cases/<uuid:case_id>", CaseDetailView.as_view()),
    path("cases/<uuid:case_id>/responses", CaseResponseView.as_view()),
    path("admin/cases", CaseQueueView.as_view()),
    path("admin/cases/<uuid:case_id>/assign", AssignCaseView.as_view()),
    path("admin/cases/<uuid:case_id>/decision", CaseDecisionView.as_view()),
    path("admin/cases/<uuid:case_id>/legal-remedy-review", LegalRemedyView.as_view()),
    path("cases/amendments", AmendmentsView.as_view()),
    path("cases/amendments/<uuid:proposal_id>/accept", AmendmentAcceptanceView.as_view()),
    path("notices", NoticesView.as_view()),
]
