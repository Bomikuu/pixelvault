from dataclasses import asdict

from config.errors import DomainError
from config.views import MemberView
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from marketplace.views import operation_id
from rest_framework.response import Response
from servicing.projections import member_summary

from .acceptance import accept_agreement
from .models import AgreementVersion
from .rendering import render_agreement


def agreement_data(agreement):
    return {
        "id": str(agreement.id),
        "state": agreement.state,
        "hash": agreement.hash,
        "version": agreement.version,
        "terms": agreement.terms,
        "disclosure": agreement.disclosure,
        "lender": member_summary(agreement.lender),
        "borrower": member_summary(agreement.borrower),
        "acceptances": [
            {
                "member_id": str(x.member_id),
                "accepted_at": x.accepted_at.isoformat(),
                "hash": x.hash,
                "provenance": x.provenance,
            }
            for x in agreement.acceptances.all()
        ],
        "test_mode": agreement.test_mode,
        "template_version": agreement.template_version,
        "expires_at": agreement.reservation.expires_at.isoformat(),
        "loan_id": str(agreement.loan.id) if hasattr(agreement, "loan") else None,
    }


def permitted(request, agreement_id):
    agreement = get_object_or_404(
        AgreementVersion.objects.select_related("lender", "borrower", "reservation"),
        pk=agreement_id,
    )
    if request.user.id not in {agreement.lender_id, agreement.borrower_id}:
        raise DomainError("not_found", "Agreement not found.", 404)
    return agreement


class AgreementsView(MemberView):
    def get(self, request):
        from django.db.models import Q

        return Response(
            [
                agreement_data(x)
                for x in AgreementVersion.objects.filter(
                    Q(lender=request.user) | Q(borrower=request.user)
                ).select_related("lender", "borrower", "reservation")
            ]
        )


class AgreementView(MemberView):
    def get(self, request, agreement_id):
        return Response(agreement_data(permitted(request, agreement_id)))


class AcceptView(MemberView):
    def post(self, request, agreement_id):
        permitted(request, agreement_id)
        result = accept_agreement(
            member_id=request.user.id,
            agreement_id=agreement_id,
            expected_hash=request.data.get("expected_hash", ""),
            operation_id=operation_id(request.data),
        )
        return Response(asdict(result))


class DocumentView(MemberView):
    def get(self, request, agreement_id):
        permitted(request, agreement_id)
        response = HttpResponse(
            render_agreement(agreement_id=agreement_id, actor_id=request.user.id),
            content_type="application/pdf",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="pixelvault-test-agreement-{agreement_id}.pdf"'
        )
        response["Cache-Control"] = "private, no-store"
        response["Content-Security-Policy"] = (
            "default-src 'none'; style-src 'unsafe-inline'; sandbox"
        )
        return response


class RenewEffectiveDateView(MemberView):
    def post(self, request, loan_id):
        from datetime import date

        from servicing.views import permitted_loan

        from .renewal import renew_effective_date

        permitted_loan(request.user, loan_id)
        if set(request.data) != {"effective_date", "operation_id"}:
            raise DomainError("renewal_input", "Provide effective_date and operation_id.")
        try:
            effective = date.fromisoformat(request.data["effective_date"])
        except (TypeError, ValueError):
            raise DomainError(
                "renewal_date", "Provide a calendar date in YYYY-MM-DD form."
            ) from None
        replacement = renew_effective_date(
            loan_id=loan_id,
            actor_id=request.user.id,
            effective_date=effective,
            operation_id=operation_id(request.data),
        )
        return Response(agreement_data(replacement), status=201)
