from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from config.errors import DomainError
from config.views import MemberView
from negotiations.services import room_for
from marketplace.models import LendingOffer
from .models import InvestmentAgreement
from .projections import portfolio, public_investors


class PortfolioView(MemberView):
    def get(self, request):
        response = Response(portfolio(request.user.id))
        response["Cache-Control"] = "private, no-store"
        return response


class InvestmentDocumentView(MemberView):
    def get(self, request, room_id):
        room = room_for(room_id, request.user.id)
        agreement = InvestmentAgreement.objects.filter(room=room).first()
        if not agreement:
            raise DomainError(
                "not_prepared", "A test investment agreement has not been prepared.", 404
            )
        approvals = "\n".join(
            f"{row.member_id} · {row.kind} · {row.created_at.isoformat()} · {row.hash}"
            for row in agreement.approvals.all()
        )
        response = HttpResponse(
            f"{agreement.body}\n\nDocument SHA-256: {agreement.hash}\n\nRecorded acknowledgments:\n{approvals}\n",
            content_type="text/plain; charset=utf-8",
        )
        response["Cache-Control"] = "private, no-store"
        response["Content-Disposition"] = (
            'attachment; filename="pixelvault-test-investment-agreement.txt"'
        )
        return response


class PublicInvestorsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, offer_id):
        offer = LendingOffer.objects.filter(
            pk=offer_id,
            status="published",
            expires_at__gt=timezone.now(),
            lender__is_active=True,
            lender__suspended=False,
        ).first()
        if not offer:
            raise DomainError("offer_unavailable", "This offer is unavailable.", 404)
        response = Response(public_investors(offer))
        response["Cache-Control"] = "no-store"
        return response
