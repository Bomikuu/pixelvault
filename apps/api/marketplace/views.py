import uuid

from agreements.schedule import generate_due_dates
from agreements.types import LoanTerms, integer
from config.errors import DomainError
from config.views import MemberView
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response

from .applications import apply_to_offer
from .models import LendingOffer, LoanApplication
from .offers import eligible, publish_offer
from .reservations import select_application
from .serializers import OfferInput, application_data, offer_data


def operation_id(data):
    try:
        return uuid.UUID(str(data["operation_id"]))
    except (KeyError, ValueError, TypeError):
        raise DomainError("operation_required", "A valid operation_id UUID is required.") from None


class OffersView(MemberView):
    def get(self, request):
        offers = (
            LendingOffer.objects.filter(status="published", expires_at__gt=timezone.now())
            .select_related("lender")
            .order_by("-created_at")
        )
        if request.query_params.get("area"):
            offers = offers.filter(area__icontains=request.query_params["area"])
        return Response([offer_data(x) for x in offers[:100]])

    def post(self, request):
        serializer = OfferInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        frequency, count, effective = (
            values["frequency"],
            values["installment_count"],
            values["effective_date"],
        )
        terms = LoanTerms(
            values.pop("principal"),
            "PHP",
            values.pop("annual_rate_bps"),
            values.pop("frequency"),
            values.pop("installment_count"),
            values.pop("effective_date"),
            generate_due_dates(effective_date=effective, frequency=frequency, count=count),
            policy_version=values.pop("policy_version"),
            lender_fees=(),
        )
        from agreements.policy import policy_for_terms

        policy = policy_for_terms(terms)
        terms = LoanTerms.from_dict(
            {
                **terms.to_dict(),
                "lender_fees": [
                    {
                        "code": "platform_commission_demo",
                        "amount": (terms.principal * policy.rules["commission_bps"] + 5000)
                        // 10000,
                        "timing": "upfront",
                    }
                ],
            }
        )
        offer = publish_offer(lender_id=request.user.id, terms=terms, **values)
        return Response(offer_data(offer), status=201)


class OfferDetailView(MemberView):
    def get(self, request, offer_id):
        offer = get_object_or_404(LendingOffer.objects.select_related("lender"), pk=offer_id)
        if offer.status not in {"published", "exhausted"} and offer.lender_id != request.user.id:
            raise DomainError("not_found", "Offer not found.", 404)
        result = offer_data(offer)
        if offer.lender_id == request.user.id:
            result["applications"] = [
                application_data(x) for x in offer.applications.select_related("borrower").all()
            ]
        else:
            own = offer.applications.filter(borrower=request.user).first()
            result["my_application"] = application_data(own) if own else None
        return Response(result)


class OfferPublishView(MemberView):
    def post(self, request, offer_id):
        offer = get_object_or_404(LendingOffer, pk=offer_id, lender=request.user)
        eligible(request.user.id, "post_offer")
        if offer.status not in {"draft", "published"}:
            raise DomainError("offer_unavailable", "Closed offers cannot be republished.", 409)
        offer.status = "published"
        offer.save(update_fields=["status", "updated_at"])
        return Response(offer_data(offer))


class ApplyView(MemberView):
    def post(self, request, offer_id):
        if set(request.data) - {"principal", "purpose", "summary", "operation_id"}:
            raise DomainError("server_terms", "Interest, fees and routing are fixed by the server.")
        application = apply_to_offer(
            borrower_id=request.user.id,
            offer_id=offer_id,
            principal=request.data.get("principal"),
            purpose=str(request.data.get("purpose", "")),
            summary=request.data.get("summary", {}),
            operation_id=operation_id(request.data),
        )
        return Response(application_data(application), status=201)


class ApplicationsView(MemberView):
    def get(self, request):
        return Response(
            [
                application_data(x)
                for x in LoanApplication.objects.filter(
                    Q(borrower=request.user) | Q(offer__lender=request.user)
                )
                .select_related("borrower", "offer__lender")
                .order_by("-created_at")
            ]
        )


class ApplicationDetailView(MemberView):
    def get(self, request, application_id):
        application = get_object_or_404(
            LoanApplication.objects.select_related("borrower", "offer"), pk=application_id
        )
        if request.user.id not in {application.borrower_id, application.offer.lender_id}:
            raise DomainError("not_found", "Application not found.", 404)
        return Response(application_data(application))


class SelectView(MemberView):
    def post(self, request, application_id):
        integer(request.data.get("expected_offer_version"), "expected_offer_version", 1)
        reservation = select_application(
            lender_id=request.user.id,
            application_id=application_id,
            expected_offer_version=request.data["expected_offer_version"],
            operation_id=operation_id(request.data),
        )
        agreement = reservation.agreements.order_by("-version").first()
        return Response(
            {
                "id": str(reservation.id),
                "status": reservation.status,
                "expires_at": reservation.expires_at.isoformat(),
                "agreement_id": str(agreement.id),
            }
        )


class WithdrawView(MemberView):
    def post(self, request, application_id):
        with transaction.atomic():
            application = get_object_or_404(
                LoanApplication.objects.select_for_update(),
                pk=application_id,
                borrower=request.user,
            )
            if application.status not in {"submitted", "reviewing"}:
                raise DomainError(
                    "application_unavailable",
                    "Selected applications require agreement resolution.",
                    409,
                )
            application.status = "withdrawn"
            application.save(update_fields=["status", "updated_at"])
        return Response(application_data(application))


class DeclineView(MemberView):
    def post(self, request, application_id):
        application = get_object_or_404(
            LoanApplication.objects.select_related("offer"),
            pk=application_id,
            offer__lender=request.user,
        )
        with transaction.atomic():
            LendingOffer.objects.select_for_update().get(pk=application.offer_id)
            application.refresh_from_db()
            if application.status == "declined":
                return Response(application_data(application))
            if application.status not in {"submitted", "reviewing"}:
                raise DomainError(
                    "application_unavailable",
                    "Selected applications require agreement resolution.",
                    409,
                )
            application.status = "declined"
            application.save(update_fields=["status", "updated_at"])
        return Response(application_data(application))
