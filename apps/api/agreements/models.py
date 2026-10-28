from config.errors import DomainError
from config.models import Record
from django.conf import settings
from django.db import models
from django.db.models import F, Q


class AgreementVersion(Record):
    reservation = models.ForeignKey(
        "marketplace.OfferReservation", on_delete=models.PROTECT, related_name="agreements"
    )
    lender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="lender_agreements"
    )
    borrower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="borrower_agreements"
    )
    version = models.PositiveIntegerField(default=1)
    terms = models.JSONField()
    disclosure = models.JSONField()
    canonical = models.JSONField()
    hash = models.CharField(max_length=64)
    template_version = models.CharField(max_length=50, default="unreviewed-demo-v1")
    state = models.CharField(max_length=30, default="awaiting_acceptance")
    test_mode = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["reservation", "version"], name="agreement_reservation_version"
            ),
            models.CheckConstraint(
                condition=~Q(lender_id=F("borrower_id")), name="agreement_distinct_parties"
            ),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            original = type(self).objects.get(pk=self.pk)
            if any(
                getattr(original, field) != getattr(self, field)
                for field in (
                    "terms",
                    "disclosure",
                    "canonical",
                    "hash",
                    "template_version",
                    "lender_id",
                    "borrower_id",
                )
            ):
                raise DomainError(
                    "immutable_agreement",
                    "Create a new agreement version; signed terms cannot be edited.",
                    409,
                )
        return super().save(*args, **kwargs)


class Acceptance(Record):
    agreement = models.ForeignKey(
        AgreementVersion, on_delete=models.PROTECT, related_name="acceptances"
    )
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    hash = models.CharField(max_length=64)
    accepted_at = models.DateTimeField()
    operation_id = models.UUIDField(unique=True)
    provenance = models.CharField(max_length=60, default="authenticated-sandbox-acceptance")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["agreement", "member"], name="one_acceptance_per_party")
        ]
