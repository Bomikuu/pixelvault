import csv
import io
from datetime import timedelta

from community.permissions import member_for, staff_for
from config.errors import DomainError
from django.db.models import F
from django.utils import timezone

from .metrics import member_metrics, operations_metrics
from .models import ExportJob


def neutralize(value):
    value = str(value)
    # CSV spreadsheet engines can interpret formulas after leading whitespace/control characters.
    if value.lstrip(" \t\r\n").startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def request_export(*, actor_id, purpose, filters):
    member_for(actor_id)
    if not isinstance(filters, dict) or set(filters) - {"role", "start", "end"}:
        raise DomainError("invalid_filters", "Export only accepts role and reporting period.")
    if purpose == "member_statement":
        data = member_metrics(
            actor_id=actor_id,
            role=filters.get("role", "borrower"),
            start=filters.get("start"),
            end=filters.get("end"),
        )
    elif purpose == "operations_summary":
        data = operations_metrics(
            actor_id=actor_id, start=filters.get("start"), end=filters.get("end")
        )
    else:
        raise DomainError("invalid_purpose", "Choose a supported purpose-limited report.")
    return ExportJob.objects.create(
        actor_id=actor_id,
        purpose=purpose,
        filters=filters,
        payload=data,
        expires_at=timezone.now() + timedelta(minutes=10),
    )


def download_export(*, actor_id, job_id, at=None):
    member_for(actor_id)
    try:
        job = ExportJob.objects.get(pk=job_id, actor_id=actor_id)
    except (ExportJob.DoesNotExist, ValueError):
        raise DomainError("not_found", "Export not found.", 404)
    if job.expires_at <= (at or timezone.now()):
        raise DomainError("export_expired", "This export expired. Request a new one.", 410)
    if job.purpose == "operations_summary":
        staff_for(actor_id, ("finance",))
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(
        ["metric", "value_centavos_or_count", "definition", "period_start", "period_end"]
    )
    for metric, amount in job.payload["metrics"].items():
        writer.writerow(
            [
                neutralize(metric),
                neutralize(amount),
                neutralize(job.payload["definitions"].get(metric, "")),
                neutralize(job.payload["period"]["start"]),
                neutralize(job.payload["period"]["end"]),
            ]
        )
    ExportJob.objects.filter(pk=job.id).update(download_count=F("download_count") + 1)
    return output.getvalue()
