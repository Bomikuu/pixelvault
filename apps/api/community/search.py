from config.errors import DomainError
from django.db.models import F
from django.utils import timezone

from .locations import coarse_area
from .profiles import public_identity


def search_offers(*, viewer_id=None, filters=None, cursor=None):
    from marketplace.models import LendingOffer

    filters = filters or {}
    allowed = {"area", "amount", "frequency", "sort", "cursor", "term"}
    if set(filters) - allowed:
        raise DomainError(
            "invalid_filters",
            "Use a city and supported loan filters; precise coordinates are not accepted.",
        )
    offers = LendingOffer.objects.select_related("lender").filter(
        status="published",
        expires_at__gt=timezone.now(),
        declared_amount__gt=F("reserved_amount") + F("committed_amount"),
        lender__is_active=True,
        lender__suspended=False,
    )
    if filters.get("area"):
        offers = offers.filter(area=coarse_area(area_code=filters["area"])["name"])
    try:
        amount = int(filters["amount"]) if filters.get("amount") else None
        if amount is not None and amount <= 0:
            raise ValueError
        offset = int(cursor or filters.get("cursor") or 0)
        if not 0 <= offset <= 10000:
            raise ValueError
    except (ValueError, TypeError):
        raise DomainError("invalid_filters", "Amount and cursor must be valid positive values.")
    if amount:
        offers = offers.filter(
            min_amount__lte=amount,
            max_amount__gte=amount,
            declared_amount__gte=F("reserved_amount") + F("committed_amount") + amount,
        )
    frequency = filters.get("frequency")
    if frequency:
        offers = offers.filter(terms__frequency=frequency)
    if filters.get("term"):
        try:
            offers = offers.filter(terms__installment_count=int(filters["term"]))
        except (TypeError, ValueError):
            raise DomainError("invalid_filters", "Term must be an installment count.")
    rows = []
    for offer in offers.order_by("-created_at")[:1000]:
        try:
            area = coarse_area(area_code=offer.area)
        except DomainError:
            continue
        rows.append(
            {
                "id": str(offer.id),
                "title": offer.title,
                "lender": public_identity(offer.lender),
                "area": area,
                "declared_available_amount": str(
                    offer.declared_amount - offer.reserved_amount - offer.committed_amount
                ),
                "min_amount": str(offer.min_amount),
                "max_amount": str(offer.max_amount),
                "terms": offer.terms,
                "cost_example": offer.disclosure,
                "comparison": "per_offer_example",
                "capacity_label": "Declared availability; not funds held by PixelVault",
                "expires_at": offer.expires_at.isoformat(),
                "created_at": offer.created_at.isoformat(),
            }
        )
    # Disclosed examples can have different dates, fees and principal. Never rank unlike scenarios as equal-cost quotes.
    if filters.get("sort") not in (None, "recent", "cost"):
        raise DomainError("invalid_sort", "Choose recent or cost.")
    return {
        "offers": rows[offset : offset + 30],
        "next_cursor": str(offset + 30) if len(rows) > offset + 30 else None,
        "cost_sort_available": False,
        "cost_comparison_note": "Costs are per-offer examples. A common principal, term and dates are required before cost ranking.",
        "map_source": "synthetic-area-centroids",
        "approximate": True,
    }
