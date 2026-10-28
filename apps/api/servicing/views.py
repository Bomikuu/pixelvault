from dataclasses import asdict

from config.views import MemberView
from django.db.models import Q
from django.shortcuts import get_object_or_404
from marketplace.views import operation_id
from rest_framework.response import Response

from .ledger import timeline_for
from .models import Loan
from .projections import get_loan_projection, member_summary
from .transfers import request_disbursement


def loans_for(user):
    return Loan.objects.filter(Q(lender=user) | Q(borrower=user)).select_related(
        "lender", "borrower", "agreement"
    )


def permitted_loan(user, loan_id):
    return get_object_or_404(loans_for(user), pk=loan_id)


class LoansView(MemberView):
    def get(self, request):
        return Response(
            [
                get_loan_projection(loan_id=x.id)
                for x in loans_for(request.user).order_by("-created_at")
            ]
        )


class LoanView(MemberView):
    def get(self, request, loan_id):
        loan = permitted_loan(request.user, loan_id)
        return Response(get_loan_projection(loan_id=loan.id))


class TimelineView(MemberView):
    def get(self, request, loan_id):
        return Response(timeline_for(permitted_loan(request.user, loan_id)))


class LoanPaymentsView(MemberView):
    def get(self, request, loan_id):
        loan = permitted_loan(request.user, loan_id)
        return Response(
            [x for x in timeline_for(loan) if x["kind"] in {"collection", "collection_reversed"}]
        )


class DisburseView(MemberView):
    def post(self, request, loan_id):
        permitted_loan(request.user, loan_id)
        return Response(
            asdict(
                request_disbursement(
                    loan_id=loan_id,
                    actor_id=request.user.id,
                    operation_id=operation_id(request.data),
                )
            )
        )


class PaymentsView(MemberView):
    def get(self, request):
        from payments.models import PaymentOperation

        operations = PaymentOperation.objects.filter(
            Q(payer=request.user) | Q(loan__lender=request.user)
        ).select_related("loan")
        return Response(
            [
                {
                    "id": str(x.id),
                    "loan_id": str(x.loan_id) if x.loan_id else None,
                    "kind": x.kind,
                    "amount": x.amount,
                    "currency": x.currency,
                    "status": x.status,
                    "checkout_url": x.checkout_url,
                    "settlement_status": "unknown",
                    "created_at": x.created_at.isoformat(),
                    "test_mode": True,
                }
                for x in operations.order_by("-created_at")
            ]
        )


class PeopleView(MemberView):
    def get(self, request):
        people = {}
        for loan in loans_for(request.user):
            member = loan.borrower if loan.lender_id == request.user.id else loan.lender
            people[str(member.id)] = member_summary(member)
        return Response(list(people.values()))


class DocumentsView(MemberView):
    def get(self, request):
        from agreements.models import AgreementVersion

        from .receipts import receipt_documents

        agreements = AgreementVersion.objects.filter(
            Q(lender=request.user) | Q(borrower=request.user)
        )
        return Response(
            [
                {
                    "id": str(x.id),
                    "title": "Unreviewed sandbox loan agreement",
                    "kind": "agreement",
                    "state": x.state,
                    "hash": x.hash,
                    "url": f"/api/v1/agreements/{x.id}/document",
                    "created_at": x.created_at.isoformat(),
                    "test_mode": True,
                }
                for x in agreements.order_by("-created_at")
            ]
            + [item for loan in loans_for(request.user) for item in receipt_documents(loan)]
        )


class LoanDocumentsView(MemberView):
    def get(self, request, loan_id):
        loan = permitted_loan(request.user, loan_id)
        agreement = loan.agreement
        from .receipts import receipt_documents

        return Response(
            [
                {
                    "id": str(agreement.id),
                    "title": "Unreviewed sandbox loan agreement",
                    "kind": "agreement",
                    "state": agreement.state,
                    "hash": agreement.hash,
                    "url": f"/api/v1/agreements/{agreement.id}/document",
                    "created_at": agreement.created_at.isoformat(),
                    "test_mode": True,
                }
            ]
            + receipt_documents(loan)
        )


class ReceiptView(MemberView):
    def get(self, request, loan_id, entry_id):
        from django.http import HttpResponse

        from .receipts import render_receipt

        loan = permitted_loan(request.user, loan_id)
        entry = get_object_or_404(loan.ledger, pk=entry_id, kind="collection")
        response = HttpResponse(
            render_receipt(loan=loan, entry=entry), content_type="application/pdf"
        )
        response["Content-Disposition"] = (
            f'attachment; filename="pixelvault-test-collection-{entry.id}.pdf"'
        )
        response["Cache-Control"] = "private, no-store"
        return response


class LoanCommissionView(MemberView):
    def get(self, request, loan_id):
        from config.errors import DomainError

        from .models import CommissionAccrual

        loan = permitted_loan(request.user, loan_id)
        if loan.lender_id != request.user.id:
            raise DomainError("not_found", "Lender commission not found.", 404)
        commission = CommissionAccrual.objects.filter(loan=loan).first()
        if not commission:
            return Response(
                {
                    "id": None,
                    "status": "not_accrued",
                    "amount": 0,
                    "collected_amount": 0,
                    "currency": "PHP",
                    "payer_id": str(loan.lender_id),
                    "test_mode": True,
                }
            )
        return Response(
            {
                "id": str(commission.id),
                "status": commission.status,
                "amount": commission.amount,
                "collected_amount": commission.collected_amount,
                "policy_version": commission.policy_version,
                "currency": "PHP",
                "payer_id": str(commission.payer_id),
                "checkout_path": f"/api/v1/commissions/{commission.id}/checkout",
                "test_mode": True,
            }
        )
