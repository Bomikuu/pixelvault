"""Private developer reference. Its schema has the same access policy as the UI."""

from pathlib import Path

from community.permissions import staff_for
from django.conf import settings
from django.http import FileResponse, HttpResponse, HttpResponseNotFound
from django.template.loader import render_to_string
from django.utils.cache import patch_vary_headers
from drf_spectacular.views import SpectacularAPIView
from rest_framework.permissions import BasePermission

ASSETS = Path(__file__).parent / "static" / "api-docs"
ASSET_TYPES = {
    "reference.js": "text/javascript",
    "bootstrap.js": "text/javascript",
    "manrope.woff2": "font/woff2",
    "logo.svg": "image/svg+xml",
}


def allowed(user):
    return bool(
        user.is_authenticated
        and user.is_active
        and user.is_staff
        and not user.suspended
        and user.staff_role in ("developer", "admin")
    )


def require_api_docs_staff(request):
    from django.core.exceptions import PermissionDenied

    if not allowed(request.user):
        raise PermissionDenied("Staff developer sign-in is required.")
    return staff_for(request.user.pk, roles=("developer",))


def private(response):
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    response["Referrer-Policy"] = "no-referrer"
    patch_vary_headers(response, ("Cookie",))
    return response


class ApiDocsPermission(BasePermission):
    message = "Staff developer sign-in is required."

    def has_permission(self, request, view):
        if not allowed(request.user):
            return False
        require_api_docs_staff(request)
        return True


class ApiDocsSchemaView(SpectacularAPIView):
    permission_classes = [ApiDocsPermission]

    def finalize_response(self, request, response, *args, **kwargs):
        return private(super().finalize_response(request, response, *args, **kwargs))


def api_reference(request):
    if not allowed(request.user):
        return private(HttpResponse(render_to_string("api_reference_denied.html", {"sign_in_url": settings.FRONTEND_URL.rstrip("/") + "/sign-in"}), status=403))
    require_api_docs_staff(request)
    response = HttpResponse(render_to_string("api_reference.html", {
        "environment": settings.ENVIRONMENT,
        "available": (ASSETS / "reference.js").is_file(),
    }))
    response["Content-Security-Policy"] = (
        "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        "font-src 'self'; img-src 'self' data:; connect-src 'self'; "
        "worker-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
    )
    return private(response)


def reference_asset(request, name):
    if not allowed(request.user):
        return private(HttpResponse("Staff developer sign-in is required.", status=403))
    require_api_docs_staff(request)
    if name not in ASSET_TYPES or not (ASSETS / name).is_file():
        return private(HttpResponseNotFound("Reference asset unavailable."))
    return private(FileResponse((ASSETS / name).open("rb"), content_type=ASSET_TYPES[name]))


def reference_description():
    root = settings.BASE_DIR / "docs" / "api" / "guides"
    introductions = [
        "# Build with PixelVault\n\nPrivate developer reference. Use synthetic records in test mode. "
        "Live origination and payout routing remain disabled. Viewing these docs grants no "
        "permission to invoke staff or financial operations.\n\n"
        "Search an operation, inspect its request/response, or follow the guides below. "
        "The request playground is intentionally disabled.\n\n"
        "**Contract coverage:** source-reviewed domain declarations describe requests and responses. "
        "Runtime projection and permission checks remain a separate release gate."
    ]
    for name in (
        "browser-sessions", "money-and-errors", "loan-lifecycle",
        "meetings-and-investments", "events-and-files", "native-client", "marketplace",
    ):
        path = root / f"{name}.md"
        if path.is_file():
            introductions.append(path.read_text(encoding="utf-8"))
    return "\n\n---\n\n".join(introductions)
