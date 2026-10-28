from config.models import Record
from django.conf import settings
from django.db import models
from django.db.models import Q


class CoBorrowerInvitation(Record):
    inviter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="co_borrower_invitations"
    )
    invitee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        related_name="accepted_co_borrower_invitations",
    )
    display_name = models.CharField(max_length=100)
    email = models.EmailField()
    mobile_number = models.CharField(max_length=20, blank=True)
    facebook_url = models.URLField(max_length=250, blank=True)
    relationship = models.CharField(max_length=30, default="other")
    status = models.CharField(max_length=20, default="pending")
    consented_at = models.DateTimeField(null=True)
    expires_at = models.DateTimeField()
    operation_id = models.UUIDField(unique=True)
    payload_hash = models.CharField(max_length=64)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["inviter", "email"],
                condition=Q(status__in=["pending", "accepted"]),
                name="one_active_co_borrower_invitation",
            )
        ]


class ApplicationCoBorrower(Record):
    application = models.OneToOneField(
        "marketplace.LoanApplication", on_delete=models.PROTECT, related_name="co_borrower_link"
    )
    invitation = models.ForeignKey(CoBorrowerInvitation, on_delete=models.PROTECT)
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
