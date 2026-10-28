from django.urls import path

from .views import (
    CommissionsView,
    ExportDownloadView,
    ExportView,
    MemberMetricsView,
    OperationsMetricsView,
    ReconciliationView,
)

urlpatterns = [
    path("admin/commissions", CommissionsView.as_view()),
    path("admin/reconciliation", ReconciliationView.as_view()),
    path("reporting/member", MemberMetricsView.as_view()),
    path("admin/reporting", OperationsMetricsView.as_view()),
    path("reporting/exports", ExportView.as_view()),
    path("reporting/exports/<uuid:job_id>/download", ExportDownloadView.as_view()),
]
