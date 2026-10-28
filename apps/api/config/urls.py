from accounts.admin_views import AuditView, PoliciesView, RegistrationQueueView, TemplatesView
from accounts.views import (
    LiteracyView,
    ProfileView,
    RegisterView,
    SessionView,
    SignInView,
    SignOutView,
    StepUpView,
)
from community.activity import ActivityStreamView, ActivityView
from django.http import JsonResponse
from django.urls import include, path
from documents.views import ContentView, DocumentsView, DownloadView, ScanView, UploadView
from drf_spectacular.views import SpectacularAPIView
from verification.views import (
    RegistrationReviewView,
    RegistrationView,
    ReviewQueueView,
    ReviewView,
    VerificationView,
)

urlpatterns = [
    path(
        "health",
        lambda r: JsonResponse(
            {"service": "pixelvault", "status": "ok", "live_origination": False}
        ),
    ),
    path("api/schema", SpectacularAPIView.as_view()),
    path("api/v1/community/activity", ActivityView.as_view()),
    path("api/v1/community/activity/stream", ActivityStreamView.as_view()),
    path("api/v1/auth/session", SessionView.as_view()),
    path("api/v1/auth/register", RegisterView.as_view()),
    path("api/v1/auth/sign-in", SignInView.as_view()),
    path("api/v1/auth/sign-out", SignOutView.as_view()),
    path("api/v1/auth/profile", ProfileView.as_view()),
    path("api/v1/auth/step-up", StepUpView.as_view()),
    path("api/v1/literacy/complete", LiteracyView.as_view()),
    path("api/v1/verification", VerificationView.as_view()),
    path("api/v1/lender-registration", RegistrationView.as_view()),
    path("api/v1/admin/verifications", ReviewQueueView.as_view()),
    path("api/v1/admin/audit", AuditView.as_view()),
    path("api/v1/admin/policies", PoliciesView.as_view()),
    path("api/v1/admin/templates", TemplatesView.as_view()),
    path("api/v1/admin/registrations", RegistrationQueueView.as_view()),
    path("api/v1/admin/verifications/<uuid:case_id>/review", ReviewView.as_view()),
    path("api/v1/admin/verifications/<uuid:case_id>", ReviewView.as_view()),
    path(
        "api/v1/admin/registrations/<uuid:registration_id>/review", RegistrationReviewView.as_view()
    ),
    path("api/v1/admin/registrations/<uuid:registration_id>", RegistrationReviewView.as_view()),
    path("api/v1/documents", DocumentsView.as_view()),
    path("api/v1/documents/upload", UploadView.as_view()),
    path("api/v1/documents/<uuid:document_id>/download", DownloadView.as_view()),
    path("api/v1/documents/<uuid:document_id>/content", ContentView.as_view()),
    path("api/v1/admin/documents/<uuid:document_id>/scan", ScanView.as_view()),
    path("api/v1/", include("marketplace.urls")),
    path("api/v1/", include("agreements.urls")),
    path("api/v1/", include("servicing.urls")),
    path("api/v1/", include("payments.urls")),
    path("api/v1/", include("community.urls")),
    path("api/v1/", include("cases.urls")),
    path("api/v1/", include("reporting.urls")),
]
