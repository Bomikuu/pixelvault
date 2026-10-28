import base64
import hashlib
import os
from pathlib import Path

from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings


def cipher():
    configured = os.getenv("PIXELVAULT_DOCUMENT_KEYS", "")
    keys = [x.strip().encode() for x in configured.split(",") if x.strip()]
    if not keys:
        if settings.ENVIRONMENT != "test":
            raise RuntimeError("Production document encryption keys are required")
        keys = [base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())]
    return MultiFernet([Fernet(key) for key in keys])


def store_private(key, raw):
    root = Path(settings.MEDIA_ROOT)
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = root / key
    path.write_bytes(cipher().encrypt(raw))
    path.chmod(0o600)


def read_private(key):
    return cipher().decrypt((Path(settings.MEDIA_ROOT) / key).read_bytes())
