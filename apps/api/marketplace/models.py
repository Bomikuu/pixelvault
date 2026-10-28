from config.models import Record
from django.conf import settings
from django.db import models
from django.db.models import F, Q


class LendingOffer(Record):
    lender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="lending_offers"
    )
    title = models.CharField(max_length=140)
    area = models.CharField(max_length=80)
    declared_amount = models.PositiveBigIntegerField()
    reserved_amount = models.PositiveBigIntegerField(default=0)
    committed_amount = models.PositiveBigIntegerField(default=0)
    min_amount = models.PositiveBigIntegerField(default=10000)
    max_amount = models.PositiveBigIntegerField()
    terms = models.JSONField()
    disclosure = models.JSONField()
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=24, default="draft")
    expires_at = models.DateTimeField()
    operation_id = models.UUIDField(unique=True)
    payload_hash = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(declared_amount__gte=F("reserved_amount") + F("committed_amount")),
                name="offer_capacity_nonnegative",
            )
        ]


class LoanApplication(Record):
    offer = models.ForeignKey(LendingOffer, on_delete=models.PROTECT, related_name="applications")
    borrower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="loan_applications"
    )
    terms = models.JSONField()
    disclosure = models.JSONField()
    purpose = models.CharField(max_length=500, blank=True)
    summary = models.JSONField(default=dict)
    status = models.CharField(max_length=24, default="submitted")
    operation_id = models.UUIDField(unique=True)
    payload_hash = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["offer", "borrower"],
                condition=Q(status__in=["submitted", "reviewing", "selected"]),
                name="one_active_application",
            )
        ]


class OfferReservation(Record):
    offer = models.ForeignKey(LendingOffer, on_delete=models.PROTECT, related_name="reservations")
    application = models.OneToOneField(
        LoanApplication, on_delete=models.PROTECT, related_name="reservation"
    )
    principal = models.PositiveBigIntegerField()
    status = models.CharField(max_length=20, default="reserved")
    expires_at = models.DateTimeField()
    operation_id = models.UUIDField(unique=True)
    payload_hash = models.CharField(max_length=64)
