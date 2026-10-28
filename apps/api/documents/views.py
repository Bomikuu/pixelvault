from audit.services import record_audit
from config.errors import DomainError
from config.views import MemberView
from django.conf import settings
from django.core import signing
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.response import Response

from .models import Document
from .services import get_download_grant, permitted_document, scan_document, upload_document
from .storage import read_private


def document_data(document):
    return {
        "id": str(document.pk),
        "name": document.name,
        "purpose": document.purpose,
        "status": document.status,
        "size": document.size,
        "created_at": document.created_at,
        "provenance": document.provenance,
    }


class DocumentsView(MemberView):
    def get(self, request):
        return Response(
            [
                document_data(d)
                for d in Document.objects.filter(owner=request.user).order_by("-created_at")
            ]
        )


class UploadView(MemberView):
    def post(self, request):
        uploaded = request.FILES.get("file")
        if not uploaded:
            raise DomainError("FILE_REQUIRED", "Choose a file to upload.")
        return Response(
            document_data(
                upload_document(
                    owner=request.user, uploaded=uploaded, purpose=request.data.get("purpose")
                )
            ),
            status=201,
        )


class DownloadView(MemberView):
    def get(self, request, document_id):
        return Response(
            get_download_grant(
                actor_id=request.user.pk,
                document_id=document_id,
                purpose=request.query_params.get("purpose", "owner"),
            )
        )


class ContentView(MemberView):
    def get(self, request, document_id):
        try:
            grant = signing.loads(
                request.query_params.get("token", ""), salt="document-grant", max_age=60
            )
        except signing.BadSignature:
            raise DomainError("EXPIRED_GRANT", "Request a new document link.", 403) from None
        if grant.get("document_id") != str(document_id) or grant.get("actor_id") != str(
            request.user.pk
        ):
            raise DomainError("FORBIDDEN", "This document link is unavailable.", 403)
        document = permitted_document(
            actor=request.user, document_id=document_id, purpose=grant.get("purpose")
        )
        if document.status != "clean" or (
            settings.ENVIRONMENT == "live" and document.provenance == "sandbox"
        ):
            raise DomainError("DOCUMENT_UNAVAILABLE", "This document is unavailable.", 409)
        response = HttpResponse(
            read_private(document.storage_key), content_type=document.content_type
        )
        response["Content-Disposition"] = "attachment; filename*=UTF-8''" + __import__(
            "urllib.parse", fromlist=["quote"]
        ).quote(document.name)
        response["Cache-Control"] = "no-store, private"
        record_audit(actor_id=request.user.pk, action="document.download", subject_id=document.pk)
        return response


class ScanView(MemberView):
    def post(self, request, document_id):
        get_object_or_404(Document, pk=document_id)
        return Response(document_data(scan_document(actor=request.user, document_id=document_id)))
