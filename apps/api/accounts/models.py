import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class Member(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=80, default="Quezon City")
    bio = models.CharField(max_length=400, blank=True)
    suspended = models.BooleanField(default=False)
    literacy_completed = models.BooleanField(default=False)
    policy_version = models.CharField(max_length=40, default="demo-v1")
    staff_role = models.CharField(max_length=30, blank=True)
    staff_step_up_until = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.display_name or self.username
