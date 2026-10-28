from datetime import timedelta
from pathlib import Path

import pytest
from accounts.models import Member
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from documents.retention import apply_retention
from documents.services import upload_document

pytestmark = pytest.mark.django_db


def test_legal_hold_and_explicit_retention(settings):
    member = Member.objects.create_user(username="retention", email="retention@example.test")
    doc = upload_document(
        owner=member, uploaded=SimpleUploadedFile("test.pdf", b"%PDF-test"), purpose="identity"
    )
    assert apply_retention(dry_run=False)["deleted"] == []
    doc.retain_until = timezone.now() - timedelta(days=1)
    doc.legal_hold = True
    doc.save()
    assert apply_retention(dry_run=False)["held"] == 1
    doc.legal_hold = False
    doc.save()
    assert apply_retention()["deleted"] == [str(doc.pk)]
    assert (Path(settings.MEDIA_ROOT) / doc.storage_key).exists()
    assert apply_retention(dry_run=False)["deleted"] == [str(doc.pk)]
    assert not (Path(settings.MEDIA_ROOT) / doc.storage_key).exists()
