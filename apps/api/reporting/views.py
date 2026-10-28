from config.errors import DomainError
from config.views import MemberView
from django.http import HttpResponse
from rest_framework.response import Response

from .exports import download_export, request_export
from .metrics import member_metrics, operations_metrics


class MemberMetricsView(MemberView):
    def get(self, request):
        if set(request.query_params) - {"role", "start", "end"}:
            raise DomainError("invalid_filters", "Reports accept your role and period only.")
        return Response(
            member_metrics(
                actor_id=request.user.id,
                role=request.query_params.get("role", "borrower"),
                start=request.query_params.get("start"),
                end=request.query_params.get("end"),
            )
        )


class OperationsMetricsView(MemberView):
    def get(self, request):
        if set(request.query_params) - {"start", "end"}:
            raise DomainError("invalid_filters", "Reports accept a reporting period only.")
        return Response(
            operations_metrics(
                actor_id=request.user.id,
                start=request.query_params.get("start"),
                end=request.query_params.get("end"),
            )
        )


class ExportView(MemberView):
    def post(self, request):
        if set(request.data) - {"purpose", "role", "start", "end"}:
            raise DomainError(
                "invalid_filters", "Exports accept purpose, role and reporting period only."
            )
        job = request_export(
            actor_id=request.user.id,
            purpose=request.data.get("purpose", "member_statement"),
            filters={
                key: request.data[key] for key in ("role", "start", "end") if key in request.data
            },
        )
        return Response(
            {
                "id": str(job.id),
                "expires_at": job.expires_at.isoformat(),
                "download_path": f"/api/v1/reporting/exports/{job.id}/download",
            },
            status=201,
        )


class ExportDownloadView(MemberView):
    def get(self, request, job_id):
        content = download_export(actor_id=request.user.id, job_id=job_id)
        response = HttpResponse(content, content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="pixelvault-purpose-report.csv"'
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class CommissionsView(MemberView):
    def get(self, request):
        from community.permissions import staff_for
        from servicing.models import CommissionAccrual

        from .metrics import DEFINITIONS

        staff_for(request.user.id, ("finance",))
        rows = CommissionAccrual.objects.order_by("-created_at")[:100]
        return Response(
            {
                "commissions": [
                    {
                        "id": str(row.id),
                        "loan_id": str(row.loan_id),
                        "amount": str(row.amount),
                        "collected_amount": str(row.collected_amount),
                        "status": row.status,
                        "policy_version": row.policy_version,
                        "payer_id": str(row.payer_id),
                        "created_at": row.created_at.isoformat(),
                    }
                    for row in rows
                ],
                "definitions": {
                    key: value
                    for key, value in DEFINITIONS.items()
                    if key.startswith("commission_")
                },
                "test_mode": True,
            }
        )


class ReconciliationView(MemberView):
    def get(self, request):
        from community.permissions import staff_for
        from payments.models import EventInbox, PaymentOperation

        staff_for(request.user.id, ("finance",))
        operations = PaymentOperation.objects.filter(
            status__in=["pending", "uncertain", "awaiting_payment"]
        ).order_by("created_at")[:100]
        inbox = EventInbox.objects.exclude(state__in=["applied", "evidence_only"]).order_by(
            "created_at"
        )[:100]
        return Response(
            {
                "operations": [
                    {
                        "id": str(row.id),
                        "loan_id": str(row.loan_id) if row.loan_id else None,
                        "kind": row.kind,
                        "status": row.status,
                        "amount": str(row.amount),
                        "payment_id": row.payment_id,
                        "created_at": row.created_at.isoformat(),
                    }
                    for row in operations
                ],
                "inbox": [
                    {
                        "id": str(row.id),
                        "event_id": row.event_id,
                        "state": row.state,
                        "attempts": row.attempts,
                        "reason": row.reason,
                    }
                    for row in inbox
                ],
                "settlement_notice": "Collection confirmation does not establish lender settlement; unsupported or unknown settlement remains unresolved.",
                "test_mode": True,
            }
        )
