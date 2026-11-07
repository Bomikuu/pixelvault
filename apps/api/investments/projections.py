from django.db.models import Q, Count, Min
from django.utils import timezone
from servicing.projections import member_summary
from .models import InvestmentAgreement, InvestmentFund
from .services import accepted, position


def agreement_data(room):
    agreement = InvestmentAgreement.objects.filter(room=room).first()
    if not agreement:
        return None
    fund = InvestmentFund.objects.filter(agreement=agreement).first()
    return {
        "id": str(agreement.id),
        "hash": agreement.hash,
        "terms": agreement.terms,
        "body": agreement.body,
        "accepted": accepted(agreement),
        "approvals": [
            {
                "member_id": str(row.member_id),
                "kind": row.kind,
                "created_at": row.created_at.isoformat(),
            }
            for row in agreement.approvals.filter(hash=agreement.hash)
        ],
        "fund": fund_data(fund) if fund else None,
        "download_url": f"/api/v1/meetings/{room.id}/investment-agreement",
    }


def fund_data(fund):
    return {
        "id": str(fund.id),
        "status": fund.status,
        "confirmed_at": fund.confirmed_at.isoformat(),
        "position": position(fund),
        "payouts": [
            {
                "id": str(row.id),
                "principal": str(row.principal_amount),
                "earnings": str(row.earnings_amount),
                "unused_capital": str(row.unallocated_amount),
                "status": row.status,
                "created_at": row.created_at.isoformat(),
                "confirmed_at": row.confirmed_at.isoformat() if row.confirmed_at else None,
            }
            for row in fund.payouts.order_by("-created_at")[:20]
        ],
        "allocations": [
            {
                "id": str(row.id),
                "loan_reference": str(row.loan_id)[:8],
                "amount": str(row.amount),
                "status": row.loan.status,
            }
            for row in fund.allocations.select_related("loan").order_by("created_at")[:100]
        ],
    }


def portfolio(member_id):
    funds = (
        InvestmentFund.objects.filter(Q(investor_id=member_id) | Q(offer__lender_id=member_id))
        .select_related("agreement__room__lender", "agreement__room__participant", "offer")
        .order_by("-confirmed_at")[:100]
    )
    return {
        "funds": [
            {
                **fund_data(fund),
                "role": "investor" if fund.investor_id == member_id else "lender",
                "person": member_summary(
                    fund.agreement.room.lender
                    if fund.investor_id == member_id
                    else fund.agreement.room.participant
                ),
                "offer_title": fund.offer.title,
                "room_id": str(fund.agreement.room_id),
                "share_bps": fund.agreement.terms["share_bps"],
            }
            for fund in funds
        ],
        "test_mode": True,
        "limit": 100,
        "notice": "All contribution and payout confirmations here are simulations. Collections do not establish lender settlement. These are not withdrawable wallet balances.",
    }


def public_investors(offer):
    from accounts.models import Member

    # One circle per person. Any anonymous contribution keeps their aggregate
    # circle anonymous too. Individual contribution amounts stay private.
    contributors = (
        InvestmentFund.objects.filter(offer=offer, status="simulated_confirmed")
        .values("investor_id")
        .annotate(
            first=Min("confirmed_at"),
            anonymous=Count("id", filter=Q(agreement__room__visibility="anonymous")),
        )
        .order_by("first", "investor_id")
    )
    total = contributors.count()
    visible = list(contributors[:5])
    members = Member.objects.in_bulk(row["investor_id"] for row in visible)
    people = []
    for row in visible:
        member = members[row["investor_id"]]
        named = not row["anonymous"] and member.is_active and not member.suspended
        people.append({"anonymous": not named, "person": member_summary(member) if named else None})
    return {
        "people": people,
        "total": total,
        "more": max(0, total - len(people)),
        "capped": False,
        "test_mode": True,
    }
