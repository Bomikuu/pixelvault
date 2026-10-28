from config.models import Record
from django.conf import settings
from django.db import models
from django.db.models import Q


class PaymentRoutingProfile(Record):
    name = models.CharField(max_length=100)
    project_id = models.CharField(max_length=100)
    tenant_id = models.CharField(max_length=100)
    environment = models.CharField(max_length=10, default="test")
    purpose = models.CharField(max_length=30, default="repayment")
    lender = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT)
    base_url = models.URLField(default="http://localhost:8000/api/v1")
    credential_env = models.CharField(max_length=100)
    webhook_secret_env = models.CharField(max_length=100)
    evidence_reference = models.CharField(max_length=200, blank=True)
    approved = models.BooleanField(default=False)
    recovery_cursor = models.CharField(max_length=500, blank=True)


class PaymentOperation(Record):
    operation_id = models.UUIDField(unique=True)
    loan = models.ForeignKey(
        "servicing.Loan", null=True, on_delete=models.PROTECT, related_name="payment_operations"
    )
    commission = models.ForeignKey(
        "servicing.CommissionAccrual", null=True, on_delete=models.PROTECT
    )
    routing = models.ForeignKey(PaymentRoutingProfile, on_delete=models.PROTECT)
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    kind = models.CharField(max_length=30, default="repayment")
    amount = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3, default="PHP")
    payable_version = models.CharField(max_length=64)
    external_id = models.CharField(max_length=150, unique=True)
    status = models.CharField(max_length=30, default="pending")
    payment_id = models.CharField(max_length=150, blank=True)
    checkout_url = models.URLField(blank=True)
    expires_at = models.DateTimeField(null=True)
    projection_version = models.PositiveIntegerField(default=0)
    projection = models.JSONField(default=dict)
    payload_hash = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["loan"],
                condition=Q(
                    kind="repayment", status__in=["pending", "uncertain", "awaiting_payment"]
                ),
                name="one_pending_collectible_per_loan",
            ),
            models.UniqueConstraint(
                fields=["routing", "payment_id"],
                condition=~Q(payment_id=""),
                name="one_mapped_payment_per_route",
            ),
        ]


class EventInbox(Record):
    routing = models.ForeignKey(PaymentRoutingProfile, on_delete=models.PROTECT)
    event_id = models.CharField(max_length=160)
    payload = models.JSONField()
    payload_hash = models.CharField(max_length=64)
    state = models.CharField(max_length=40, default="received")
    attempts = models.PositiveIntegerField(default=0)
    reason = models.CharField(max_length=300, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["routing", "event_id"], name="one_event_per_route")
        ]


class FinancialSource(Record):
    routing = models.ForeignKey(PaymentRoutingProfile, on_delete=models.PROTECT)
    kind = models.CharField(max_length=20)
    reference = models.CharField(max_length=180)
    operation = models.ForeignKey(PaymentOperation, on_delete=models.PROTECT)
    amount = models.PositiveBigIntegerField()
    effective_at = models.DateTimeField()
    original_reference = models.CharField(max_length=180, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["routing", "kind", "reference"], name="unique_semantic_financial_source"
            )
        ]


class RefundOperation(Record):
    operation_id = models.UUIDField(unique=True)
    payment_operation = models.ForeignKey(
        PaymentOperation, on_delete=models.PROTECT, related_name="refund_operations"
    )
    amount = models.PositiveBigIntegerField()
    reason = models.CharField(max_length=300)
    status = models.CharField(max_length=30, default="pending")
    refund_id = models.CharField(max_length=160, blank=True)
