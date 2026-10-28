from agreements.types import integer
from rest_framework import serializers
from servicing.projections import member_summary


class OfferInput(serializers.Serializer):
    title = serializers.CharField(max_length=140)
    area = serializers.CharField(max_length=80)
    declared_amount = serializers.IntegerField(min_value=1)
    principal = serializers.IntegerField(min_value=1)
    annual_rate_bps = serializers.IntegerField(min_value=0, max_value=100000)
    frequency = serializers.ChoiceField(choices=["weekly", "twice_monthly", "monthly", "maturity"])
    installment_count = serializers.IntegerField(min_value=1, max_value=120)
    effective_date = serializers.DateField()
    min_amount = serializers.IntegerField(min_value=1, default=10000)
    max_amount = serializers.IntegerField(min_value=1, required=False)
    policy_version = serializers.CharField(max_length=60, default="demo-v1")
    operation_id = serializers.UUIDField()

    def to_internal_value(self, data):
        for name in (
            "declared_amount",
            "principal",
            "annual_rate_bps",
            "installment_count",
            "min_amount",
            "max_amount",
        ):
            if name in data:
                integer(data[name], name)
        return super().to_internal_value(data)


def application_data(application):
    from connections.services import application_companion

    agreement = (
        application.reservation.agreements.order_by("-version").first()
        if hasattr(application, "reservation")
        else None
    )
    return {
        "id": str(application.id),
        "offer_id": str(application.offer_id),
        "principal": application.terms["principal"],
        "created_at": application.created_at.isoformat(),
        "agreement_id": str(agreement.id) if agreement else None,
        "borrower": member_summary(application.borrower),
        "lender": member_summary(application.offer.lender),
        "offer": {
            "id": str(application.offer_id),
            "version": application.offer.version,
            "title": application.offer.title,
        },
        "terms": application.terms,
        "disclosure": application.disclosure,
        "purpose": application.purpose,
        "summary": application.summary,
        "status": application.status,
        "co_borrower": application_companion(application),
        "test_mode": True,
    }


def offer_data(offer):
    return {
        "id": str(offer.id),
        "title": offer.title,
        "area": offer.area,
        "lender": member_summary(offer.lender),
        "declared_amount": offer.declared_amount,
        "available_amount": offer.declared_amount - offer.reserved_amount - offer.committed_amount,
        "reserved_amount": offer.reserved_amount,
        "committed_amount": offer.committed_amount,
        "min_amount": offer.min_amount,
        "max_amount": offer.max_amount,
        "status": offer.status,
        "version": offer.version,
        "annual_rate_bps": offer.terms["annual_rate_bps"],
        "frequency": offer.terms["frequency"],
        "installment_count": offer.terms["installment_count"],
        "terms": offer.terms,
        "disclosure": offer.disclosure,
        "expires_at": offer.expires_at.isoformat(),
        "test_mode": True,
        "capacity_label": "Declared offer capacity; not cash held by PixelVault",
    }
