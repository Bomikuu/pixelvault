import os
from datetime import datetime

from config.errors import DomainError
from django.conf import settings

from .contracts import CheckoutLink
from .models import PaymentRoutingProfile
from .vendor_sdk.client import Pixelflow


def client_for(routing):
    if (
        routing.environment != "test"
        or settings.ENVIRONMENT != "test"
        or not routing.approved
        or not routing.evidence_reference
    ):
        raise DomainError(
            "routing_unapproved",
            "An approved test routing profile is required. Live collections remain disabled.",
            403,
        )
    key = os.environ.get(routing.credential_env, "")
    if not key:
        raise DomainError(
            "routing_unconfigured", "PixelFlow test credentials have not been configured.", 503
        )
    return Pixelflow(routing.base_url, key)


def create_checkout(*, payable, operation_id):
    routing = PaymentRoutingProfile.objects.get(pk=payable.routing_id)
    payload = {
        "external_id": str(payable.id),
        "version": payable.version,
        "amount": payable.amount,
        "currency": payable.currency,
        "description": "PixelVault test repayment"
        if payable.kind == "repayment"
        else "PixelVault test platform service fee",
        "methods": ["gcash", "card"],
        "success_url": settings.FRONTEND_URL + "/payments?checkout=returned",
        "cancel_url": settings.FRONTEND_URL + "/payments?checkout=cancelled",
    }
    result = client_for(routing).create_checkout(payload, str(operation_id))
    data = result.get("data", result)
    expires = data.get("expires_at")
    return CheckoutLink(
        str(data.get("payment_id", data.get("id", ""))),
        data["checkout_url"],
        datetime.fromisoformat(expires.replace("Z", "+00:00")) if expires else None,
    )
