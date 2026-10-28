from config.models import Record
from django.conf import settings
from django.db import models


class ExportJob(Record):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    purpose = models.CharField(max_length=40)
    filters = models.JSONField()
    payload = models.JSONField()
    expires_at = models.DateTimeField()
    download_count = models.PositiveIntegerField(default=0)
