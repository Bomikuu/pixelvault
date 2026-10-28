from dataclasses import asdict

from config.errors import DomainError
from config.views import MemberView
from marketplace.views import operation_id
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .inbox import receive_webhook
from .operations import begin_checkout, begin_commission_checkout


class CheckoutView(MemberView):
    def post(self, request, loan_id):
        if set(request.data) - {"operation_id", "mode", "requested_amount"}:
            raise DomainError(
                "server_payable",
                "The server determines amount, payer, version and payment routing.",
            )
        return Response(
            asdict(
                begin_checkout(
                    loan_id=loan_id,
                    payer_id=request.user.id,
                    operation_id=operation_id(request.data),
                    mode=request.data.get("mode", "installment"),
                    requested_amount=request.data.get("requested_amount"),
                )
            )
        )


class CommissionCheckoutView(MemberView):
    def post(self, request, accrual_id):
        if set(request.data) != {"operation_id"}:
            raise DomainError("server_payable", "The server determines fee amount and routing.")
        return Response(
            asdict(
                begin_commission_checkout(
                    accrual_id=accrual_id,
                    payer_id=request.user.id,
                    operation_id=operation_id(request.data),
                )
            )
        )


class WebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, routing_id):
        receipt = receive_webhook(
            routing_id=routing_id,
            raw_body=request.body,
            signature=request.headers.get("Pixelflow-Signature", ""),
            event_id_header=request.headers.get("Pixelflow-Event-ID", ""),
        )
        return Response(asdict(receipt), status=202)


class PaymentPreviewView(MemberView):
    def get(self, request, loan_id):
        from servicing.payment_review import payment_review
        from servicing.projections import get_loan_projection
        from servicing.views import permitted_loan

        loan = permitted_loan(request.user, loan_id)
        if loan.borrower_id != request.user.id:
            raise DomainError("not_found", "Borrower payment review not found.", 404)
        amount = request.query_params.get("amount")
        if amount is not None:
            try:
                amount = int(amount)
            except (ValueError, TypeError):
                raise DomainError(
                    "payment_amount", "Partial amount must be integer centavos."
                ) from None
        return Response(
            payment_review(
                projection=get_loan_projection(loan_id=loan.id),
                mode=request.query_params.get("mode", "installment"),
                requested_amount=amount,
            )
        )
