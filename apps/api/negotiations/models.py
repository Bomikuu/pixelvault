from config.models import Record
from django.conf import settings
from django.db import models
from django.db.models import F, Q


class Room(Record):
    kind = models.CharField(max_length=20)
    lender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="hosted_rooms"
    )
    participant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="invited_rooms"
    )
    offer = models.ForeignKey("marketplace.LendingOffer", on_delete=models.PROTECT)
    application = models.OneToOneField(
        "marketplace.LoanApplication", null=True, on_delete=models.PROTECT
    )
    thread = models.OneToOneField("community.Thread", on_delete=models.PROTECT)
    visibility = models.CharField(max_length=12, default="anonymous")
    revision = models.PositiveIntegerField(default=1)
    event_sequence = models.PositiveIntegerField(default=0)
    agenda = models.CharField(max_length=20, default="funding")
    state = models.CharField(max_length=30, default="negotiating")
    scheduled_at = models.DateTimeField(null=True)
    schedule_version = models.PositiveIntegerField(default=0)
    proposal = models.JSONField(default=dict)
    proposal_version = models.PositiveIntegerField(default=1)
    proposal_hash = models.CharField(max_length=64)
    agreement = models.ForeignKey(
        "agreements.AgreementVersion", null=True, on_delete=models.PROTECT
    )
    operation_id = models.UUIDField(unique=True)
    payload_hash = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=~Q(lender=F("participant")), name="room_distinct_parties"
            ),
            models.CheckConstraint(
                condition=Q(kind="investment", application__isnull=True)
                | Q(kind="borrowing", application__isnull=False),
                name="room_valid_context",
            ),
            models.UniqueConstraint(
                fields=["offer", "participant"],
                condition=Q(kind="investment", state="negotiating"),
                name="one_open_pitch_per_offer",
            ),
        ]


class Attendance(Record):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="attendance")
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    schedule_version = models.PositiveIntegerField(default=0)
    checked_in_at = models.DateTimeField(null=True)
    heartbeat_at = models.DateTimeField(null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["room", "member"], name="one_room_attendance")
        ]


class Approval(Record):
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name="approvals")
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    proposal_version = models.PositiveIntegerField()
    hash = models.CharField(max_length=64)
    kind = models.CharField(max_length=20, default="proposal")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["room", "member", "proposal_version", "kind"],
                name="one_room_approval_per_version",
            )
        ]


class RoomEvent(Record):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="events")
    sequence = models.PositiveIntegerField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    kind = models.CharField(max_length=40)
    detail = models.JSONField(default=dict)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["room", "sequence"], name="unique_room_event_sequence")
        ]


class RoomCommand(Record):
    room = models.ForeignKey(Room, on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    operation_id = models.UUIDField(unique=True)
    payload_hash = models.CharField(max_length=64)


class Evidence(Record):
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name="evidence")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    document = models.ForeignKey("documents.Document", on_delete=models.PROTECT)
    category = models.CharField(max_length=20)
    revoked = models.BooleanField(default=False)
