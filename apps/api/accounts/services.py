import uuid

from config.errors import DomainError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction

from .models import AVATAR_KEYS, Member


def validate_avatar_key(value):
    if not isinstance(value, str) or value not in AVATAR_KEYS:
        raise DomainError("INVALID_AVATAR", "Choose one of the available profile illustrations.")
    return value


def register_member(*, email, password, accepted_policy_version, display_name=""):
    if (
        not isinstance(email, str)
        or not isinstance(password, str)
        or not isinstance(display_name, str)
    ):
        raise DomainError(
            "INVALID_REGISTRATION", "Use text values for email, password and display name."
        )
    if accepted_policy_version != "demo-v1":
        raise DomainError(
            "POLICY_ACCEPTANCE_REQUIRED", "Read and accept the current service and privacy terms."
        )
    email = str(email).strip().lower()
    try:
        validate_email(email)
        validate_password(password)
    except ValidationError as exc:
        raise DomainError("INVALID_REGISTRATION", " ".join(exc.messages)) from None
    try:
        with transaction.atomic():
            return Member.objects.create_user(
                username="member-" + uuid.uuid4().hex[:12],
                email=email,
                password=password,
                display_name=display_name[:100],
                policy_version=accepted_policy_version,
            )
    except IntegrityError:
        raise DomainError(
            "REGISTRATION_UNAVAILABLE", "This email cannot be registered. Try signing in.", 409
        ) from None
