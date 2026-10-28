import uuid
from datetime import timedelta
from pathlib import Path

from accounts.permissions import require_staff
from audit.services import record_audit
from config.errors import DomainError
from django.conf import settings
from django.core import signing
from django.utils import timezone

from .models import Document
from .storage import read_private, store_private


def permitted_document(*, actor, document_id, purpose):
    document = Document.objects.filter(pk=document_id).first()
    if not document:
        raise DomainError("NOT_FOUND", "This document is unavailable.", 404)
    if document.owner_id != actor.pk:
        require_staff(actor, {"reviewer"}, sensitive=True)
        if purpose != "verification_review":
            raise DomainError("FORBIDDEN", "This document is unavailable.", 403)
        from verification.models import VerificationCase

        cases = VerificationCase.objects.filter(document=document)
        if actor.staff_role != "admin":
            cases = cases.filter(assigned_to=actor)
        if not cases.exists():
            raise DomainError("FORBIDDEN", "This document is unavailable.", 403)
    return document


def upload_document(*, owner, uploaded, purpose):
    if not isinstance(purpose, str) or purpose not in {
        "identity",
        "income",
        "address",
        "funding_account",
        "registration",
    }:
        raise DomainError("INVALID_PURPOSE", "Choose a permitted evidence category.")
    if uploaded.size > 10 * 1024 * 1024 or uploaded.size == 0:
        raise DomainError("INVALID_FILE_SIZE", "Upload a non-empty file of at most 10 MiB.")
    raw = uploaded.read()
    types = [
        (b"%PDF-", "application/pdf"),
        (b"\x89PNG\r\n\x1a\n", "image/png"),
        (b"\xff\xd8\xff", "image/jpeg"),
    ]
    kind = next((mime for magic, mime in types if raw.startswith(magic)), None)
    if not kind:
        raise DomainError("INVALID_FILE_TYPE", "Upload a PDF, PNG or JPEG file.")
    key = str(uuid.uuid4())
    store_private(key, raw)
    document = Document.objects.create(
        owner=owner,
        name=Path(uploaded.name).name[:160],
        purpose=purpose,
        storage_key=key,
        content_type=kind,
        size=len(raw),
        status="quarantined",
    )
    record_audit(actor_id=owner.pk, action="document.upload", subject_id=document.pk)
    return document


def scan_document(*, actor, document_id):
    require_staff(actor, {"reviewer"}, sensitive=True)
    if settings.ENVIRONMENT != "test":
        raise DomainError("SCANNER_UNAVAILABLE", "A production scanner must be configured.", 503)
    document = Document.objects.get(pk=document_id)
    raw = read_private(document.storage_key)
    document.status = "rejected" if b"EICAR" in raw else "clean"
    document.provenance = "sandbox"
    document.save()
    record_audit(actor_id=actor.pk, action="document.sandbox_scan", subject_id=document.pk)
    return document


def get_download_grant(*, actor_id, document_id, purpose="owner"):
    from accounts.models import Member

    actor = Member.objects.get(pk=actor_id)
    document = permitted_document(actor=actor, document_id=document_id, purpose=purpose)
    if document.status != "clean" or (
        settings.ENVIRONMENT == "live" and document.provenance == "sandbox"
    ):
        raise DomainError(
            "DOCUMENT_UNAVAILABLE", "This file has not passed the configured safety review.", 409
        )
    token = signing.dumps(
        {"document_id": str(document.pk), "actor_id": str(actor.pk), "purpose": purpose},
        salt="document-grant",
    )
    record_audit(actor_id=actor.pk, action="document.grant", subject_id=document.pk)
    return {
        "url": f"/api/v1/documents/{document.pk}/content?token={token}",
        "expires_at": (timezone.now() + timedelta(seconds=60)).isoformat(),
    }
