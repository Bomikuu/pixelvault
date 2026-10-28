import time
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

import pytest
from accounts.models import Member
from config.errors import DomainError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from documents.services import get_download_grant, scan_document, upload_document
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def evidence(settings):
    owner = Member.objects.create_user(username="owner", email="owner@example.test")
    reviewer = Member.objects.create_user(
        username="reviewer",
        email="reviewer@example.test",
        is_staff=True,
        staff_role="admin",
        staff_step_up_until=timezone.now() + timedelta(minutes=5),
    )
    document = upload_document(
        owner=owner,
        uploaded=SimpleUploadedFile(
            "evidence.pdf", b"%PDF-1.4 SYNTHETIC PRIVATE EVIDENCE", content_type="application/pdf"
        ),
        purpose="income",
    )
    return owner, reviewer, document


def test_quarantined_document_cannot_download(evidence):
    owner, _, document = evidence
    with pytest.raises(DomainError):
        get_download_grant(actor_id=owner.pk, document_id=document.pk)


def test_private_evidence_encrypted_at_rest(evidence, settings):
    _, _, document = evidence
    assert (
        b"SYNTHETIC PRIVATE EVIDENCE"
        not in (Path(settings.MEDIA_ROOT) / document.storage_key).read_bytes()
    )


def test_guessed_document_denies_metadata_and_url(evidence):
    owner, reviewer, document = evidence
    other = Member.objects.create_user(username="other", email="other@example.test")
    scan_document(actor=reviewer, document_id=document.pk)
    client = APIClient()
    client.force_authenticate(other)
    result = client.get(f"/api/v1/documents/{document.pk}/download")
    assert result.status_code == 403
    assert "url" not in result.json() and "evidence.pdf" not in str(result.json())


def test_download_grant_is_owner_bound_and_expires(evidence):
    owner, reviewer, document = evidence
    scan_document(actor=reviewer, document_id=document.pk)
    grant = get_download_grant(actor_id=owner.pk, document_id=document.pk)
    client = APIClient()
    client.force_authenticate(owner)
    assert client.get(grant["url"]).status_code == 200
    other = Member.objects.create_user(username="other", email="other@example.test")
    client.force_authenticate(other)
    assert client.get(grant["url"]).status_code == 403
    client.force_authenticate(owner)
    later = time.time() + 61
    with patch("time.time", return_value=later):
        assert client.get(grant["url"]).status_code == 403


def test_scan_is_explicitly_sandbox_and_live_denied(evidence, settings):
    owner, reviewer, document = evidence
    scan_document(actor=reviewer, document_id=document.pk)
    document.refresh_from_db()
    assert document.provenance == "sandbox"
    settings.ENVIRONMENT = "live"
    with pytest.raises(DomainError):
        get_download_grant(actor_id=owner.pk, document_id=document.pk)
