import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

AVATAR_CHOICES = (
    ("sprout", "Sprout"),
    ("navigator", "Navigator"),
    ("maker", "Maker"),
    ("reader", "Reader"),
    ("dreamer", "Dreamer"),
    ("connector", "Connector"),
    ("explorer", "Explorer"),
    ("keeper", "Keeper"),
)
AVATAR_KEYS = frozenset(key for key, _ in AVATAR_CHOICES)


class Member(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    mobile_number = models.CharField(max_length=20, blank=True)
    photo_mode = models.CharField(
        max_length=10,
        choices=(("avatar", "Illustrated avatar"), ("photo", "Uploaded photo")),
        default="avatar",
    )
    profile_photo_id = models.UUIDField(null=True, blank=True, unique=True, editable=False)
    profile_photo = models.BinaryField(default=bytes, blank=True, editable=False)
    display_name = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=80, default="Quezon City")
    bio = models.CharField(max_length=400, blank=True)
    avatar_key = models.CharField(max_length=20, choices=AVATAR_CHOICES, default="sprout")
    last_active_at = models.DateTimeField(null=True, blank=True, editable=False)
    suspended = models.BooleanField(default=False)
    literacy_completed = models.BooleanField(default=False)
    policy_version = models.CharField(max_length=40, default="demo-v1")
    staff_role = models.CharField(max_length=30, blank=True)
    staff_step_up_until = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.display_name or self.username
