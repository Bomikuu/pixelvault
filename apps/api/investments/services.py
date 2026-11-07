import uuid

"""Exact test accounting. No live payment/provider or legal-approval claim."""
from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from config.errors import DomainError
from .models import (
    InvestmentAgreement,
    InvestmentApproval,
    InvestmentFund,
    InvestmentAllocation,
    InvestmentAccrual,
    InvestmentPayout,
)


def test_only():
    if settings.ENVIRONMENT != "test":
        raise DomainError(
            "live_investment_disabled",
            "Live investment origination and payouts have no approved routing arrangement.",
            403,
        )


def policy():
    return {
        "version": "demo-investment-v1",
        "bps": settings.INVESTMENT_DEMO_FEE_BPS,
        "payer": "lender",
        "timing": "upfront_separate",
    }


def proposal_terms(proposal):
    return {
        **proposal,
        "fee_policy": policy(),
        "allocation_policy": "fifo_new_loans_no_reinvestment",
        "capital_return": "allocated_collections_or_mutual_unused_return",
    }


def prepare(room):
    test_only()
    from negotiations.services import digest

    existing = InvestmentAgreement.objects.filter(room=room).first()
    if existing:
        if existing.proposal_hash != room.proposal_hash:
            raise DomainError(
                "agreement_changed", "This room already has frozen investment terms.", 409
            )
        return existing
    if (
        room.proposal.get("fee_policy") != policy()
        or room.proposal.get("allocation_policy") != "fifo_new_loans_no_reinvestment"
    ):
        raise DomainError(
            "republish_proposal",
            "Publish a new proposal with the disclosed test fee, allocation and capital-return terms before both people approve it.",
            409,
        )
    terms = {
        **room.proposal,
        "lender_id": str(room.lender_id),
        "investor_id": str(room.participant_id),
        "offer_id": str(room.offer_id),
        "room_id": str(room.id),
        "currency": "PHP",
        "platform_fee": (room.proposal["amount"] * settings.INVESTMENT_DEMO_FEE_BPS + 5000)
        // 10000,
        "test_mode": True,
        "template_version": "investment-demo-v1",
    }
    body = "\n\n".join(
        [
            "PIXELVAULT · TEST INVESTMENT AGREEMENT · investment-demo-v1",
            "This is a synthetic development agreement. It is not an approved live investment product or a legal-template approval. No real funds are moved by this software.",
            f"Lender: {room.lender.display_name}. Investor: {room.participant.display_name}. Offer: {room.offer.title}.",
            f"Contribution: {terms['amount']} centavos (PHP). The full contribution increases the offer pool only after both people separately confirm simulated funding. A lender-paid upfront platform fee of {terms['platform_fee']} centavos ({settings.INVESTMENT_DEMO_FEE_BPS / 100:.2f} percent) is separate; it is never deducted from investor principal. No repayment commission is charged.",
            f"The investor receives {terms['share_bps'] / 100:.2f} percent of interest actually allocated from confirmed collections on capital funded by this contribution, net of collection reversals. Principal, late charges, uncollected and projected interest are excluded from earnings. Collection is not proof of lender settlement; no withdrawable wallet is created.",
            "Capital allocation: confirmed contributions are allocated first-in, first-out to new loans under this offer that are created after contribution confirmation. Existing loans are excluded. Allocation is frozen on confirmed loan disbursement, cannot exceed contributed principal, and is not automatically reinvested. Whole-centavo rounding uses cumulative allocated collections.",
            "Capital return: collected principal allocated to this contribution is repayable to the investor. Unallocated capital may be returned through a mutual return proposal if current unreserved offer capacity still permits it. A proposal reserves no money; amounts are checked again at confirmation. The investor bears their allocated borrower-default loss; the lender does not guarantee capital or earnings.",
            "Transfers and payouts are simulations requiring both parties. An uploaded receipt, file safety review, proposal approval or contract acceptance does not establish a real transfer. Identity, income and financial documents remain private; neither party may publish debts, harvest contacts or threaten the other.",
            "The investor may separately choose a named or anonymous public circle after simulated funding. Changing that appearance does not amend financial terms. Disputes and hardship use private support. Changes to frozen commercial terms require a new agreement, not an edited signature.",
            f"Proposal version: {room.proposal_version}. Proposal SHA-256: {room.proposal_hash}.",
        ]
    )
    return InvestmentAgreement.objects.create(
        room=room,
        terms=terms,
        proposal_hash=room.proposal_hash,
        body=body,
        hash=digest({"terms": terms, "body": body}),
    )


def accepted(agreement):
    return agreement.approvals.filter(kind="contract", hash=agreement.hash).count() == 2


def accept(room, actor_id, expected_hash):
    test_only()
    agreement = InvestmentAgreement.objects.filter(room=room).first()
    if not agreement or expected_hash != agreement.hash:
        raise DomainError("agreement_changed", "Review the current prepared test agreement.", 409)
    InvestmentApproval.objects.get_or_create(
        agreement=agreement, member_id=actor_id, kind="contract", defaults={"hash": agreement.hash}
    )
    if accepted(agreement):
        room.state = "agreed"
    return agreement


def confirm_funding(room, actor_id, expected_hash):
    test_only()
    agreement = InvestmentAgreement.objects.filter(room=room).first()
    if not agreement or expected_hash != agreement.hash or not accepted(agreement):
        raise DomainError(
            "agreement_required",
            "Both people must accept the exact current test agreement before simulating funding.",
            409,
        )
    if InvestmentFund.objects.filter(agreement=agreement).exists():
        return
    from marketplace.models import LendingOffer

    offer = LendingOffer.objects.select_for_update().get(pk=room.offer_id)
    if offer.status not in {"published", "exhausted"} or offer.expires_at <= timezone.now():
        raise DomainError("offer_unavailable", "This offer cannot receive a contribution now.", 409)
    InvestmentApproval.objects.get_or_create(
        agreement=agreement, member_id=actor_id, kind="funding", defaults={"hash": agreement.hash}
    )
    if agreement.approvals.filter(kind="funding", hash=agreement.hash).count() != 2:
        return
    from marketplace.offers import eligible

    eligible(room.lender_id, "lend")
    eligible(room.participant_id, "accept")
    amount = agreement.terms["amount"]
    if offer.declared_amount + amount > 9007199254740991:
        raise DomainError(
            "capacity_limit", "This contribution exceeds the supported exact-capacity range."
        )
    InvestmentFund.objects.create(
        agreement=agreement,
        offer=offer,
        investor_id=room.participant_id,
        amount=amount,
        platform_fee=agreement.terms["platform_fee"],
        confirmed_at=timezone.now(),
        source_key=f"sandbox-investment:{agreement.id}",
    )
    offer.declared_amount += amount
    offer.status = "published"
    offer.version += 1
    offer.save(update_fields=["declared_amount", "status", "version", "updated_at"])


def allocate_capital(loan):
    """Called inside the confirmed-disbursement transaction, before collections."""
    test_only()
    offer_id = loan.agreement.reservation.offer_id
    remaining = int(loan.agreement.terms["principal"]) - (
        loan.investment_allocations.aggregate(total=Sum("amount"))["total"] or 0
    )
    if remaining <= 0:
        return
    funds = (
        InvestmentFund.objects.select_for_update()
        .filter(offer_id=offer_id, status="simulated_confirmed", confirmed_at__lte=loan.created_at)
        .order_by("confirmed_at", "id")
    )
    for fund in funds:
        if InvestmentAllocation.objects.filter(fund=fund, loan=loan).exists():
            continue
        used = fund.allocations.aggregate(total=Sum("amount"))["total"] or 0
        returned = (
            fund.payouts.filter(status="simulated_confirmed").aggregate(
                total=Sum("unallocated_amount")
            )["total"]
            or 0
        )
        amount = min(remaining, max(0, fund.amount - used - returned))
        if amount:
            InvestmentAllocation.objects.create(fund=fund, loan=loan, amount=amount)
            remaining -= amount
        if not remaining:
            break


def attribute_collection(entry):
    if settings.ENVIRONMENT != "test" or entry.kind not in {"collection", "collection_reversed"}:
        return
    loan = entry.loan
    original = int(loan.agreement.terms["principal"])
    totals = loan.ledger.filter(kind__in=["collection", "collection_reversed"]).aggregate(
        principal=Sum("principal_delta"), interest=Sum("interest_delta")
    )
    for allocation in loan.investment_allocations.select_related("fund__agreement").order_by(
        "fund_id"
    ):
        InvestmentFund.objects.select_for_update().get(pk=allocation.fund_id)
        if allocation.accruals.filter(entry=entry).exists():
            continue
        principal = max(0, -(totals["principal"] or 0)) * allocation.amount // original
        earnings = (
            max(0, -(totals["interest"] or 0))
            * allocation.amount
            * allocation.fund.agreement.terms["share_bps"]
            // (original * 10000)
        )
        prior = allocation.accruals.aggregate(
            principal=Sum("principal_delta"), earnings=Sum("earnings_delta")
        )
        InvestmentAccrual.objects.create(
            allocation=allocation,
            entry=entry,
            principal_delta=min(allocation.amount, principal) - (prior["principal"] or 0),
            earnings_delta=earnings - (prior["earnings"] or 0),
        )


def position(fund):
    allocated = fund.allocations.aggregate(total=Sum("amount"))["total"] or 0
    facts = InvestmentAccrual.objects.filter(allocation__fund=fund).aggregate(
        principal=Sum("principal_delta"), earnings=Sum("earnings_delta")
    )
    paid = fund.payouts.filter(status="simulated_confirmed").aggregate(
        principal=Sum("principal_amount"),
        earnings=Sum("earnings_amount"),
        unused=Sum("unallocated_amount"),
    )
    principal = facts["principal"] or 0
    earned = facts["earnings"] or 0
    unused = paid["unused"] or 0
    loss = 0
    for allocation in fund.allocations.select_related("loan__agreement"):
        delta = (
            allocation.loan.ledger.filter(kind="loss_recorded").aggregate(
                total=Sum("principal_delta")
            )["total"]
            or 0
        )
        loss += min(
            allocation.amount,
            max(0, -delta) * allocation.amount // int(allocation.loan.agreement.terms["principal"]),
        )
    return {
        "contributed": str(fund.amount),
        "allocated": str(allocated),
        "unallocated": str(max(0, fund.amount - allocated - unused)),
        "principal_collected": str(principal),
        "earnings": str(earned),
        "principal_returned": str(paid["principal"] or 0),
        "earnings_paid": str(paid["earnings"] or 0),
        "principal_due": str(principal - ((paid["principal"] or 0) - unused)),
        "earnings_due": str(earned - (paid["earnings"] or 0)),
        "recorded_loss": str(loss),
        "capital_exposure": str(max(0, allocated - principal - loss)),
        "platform_fee": str(fund.platform_fee),
        "simulated": True,
    }


def payout(room, actor_id, data, operation_id):
    test_only()
    from marketplace.models import LendingOffer

    offer = LendingOffer.objects.select_for_update().get(pk=room.offer_id)
    fund = InvestmentFund.objects.select_for_update().filter(agreement__room=room).first()
    if not fund:
        raise DomainError("funding_required", "Simulated funding must be confirmed first.", 409)
    values = position(fund)
    if data["action"] == "prepare_payout":
        if actor_id != room.lender_id:
            raise DomainError("lender_action", "The lender proposes a simulated payout.", 403)
        if fund.payouts.filter(status="awaiting_investor").exists():
            raise DomainError("payout_pending", "Resolve the current payout proposal first.", 409)
        if int(values["principal_due"]) < 0 or int(values["earnings_due"]) < 0:
            raise DomainError(
                "reversal_review",
                "A reversal requires private reconciliation before another payout.",
                409,
            )
        unused = int(values["unallocated"]) if data.get("return_unallocated") is True else 0
        principal, earnings = int(values["principal_due"]) + unused, int(values["earnings_due"])
        if principal + earnings <= 0:
            raise DomainError(
                "nothing_due",
                "There is no allocated collection or selected unused capital to return.",
                409,
            )
        InvestmentPayout.objects.create(
            fund=fund,
            principal_amount=principal,
            earnings_amount=earnings,
            unallocated_amount=unused,
            operation_id=operation_id,
        )
    else:
        try:
            payout_id = uuid.UUID(str(data.get("payout_id")))
        except (ValueError, TypeError):
            raise DomainError("invalid_payout", "Choose a current payout proposal.") from None
        pending = fund.payouts.filter(status="awaiting_investor", pk=payout_id).first()
        if not pending:
            raise DomainError("payout_changed", "This payout proposal is no longer pending.", 409)
        if data["action"] == "cancel_payout":
            pending.status = "cancelled"
        else:
            if actor_id != fund.investor_id:
                raise DomainError(
                    "investor_action",
                    "The investor independently confirms the simulated payout.",
                    403,
                )
            if (
                pending.principal_amount - pending.unallocated_amount > int(values["principal_due"])
                or pending.earnings_amount > int(values["earnings_due"])
                or pending.unallocated_amount > int(values["unallocated"])
            ):
                raise DomainError(
                    "payout_changed",
                    "Collections, returns or reversals changed the amount. Cancel and prepare a new proposal.",
                    409,
                )
            if (
                offer.declared_amount - offer.reserved_amount - offer.committed_amount
                < pending.unallocated_amount
            ):
                raise DomainError(
                    "capacity_reserved",
                    "Current reservations prevent this unused-capital return. Try after they are resolved.",
                    409,
                )
            offer.declared_amount -= pending.unallocated_amount
            offer.version += 1
            offer.save(update_fields=["declared_amount", "version", "updated_at"])
            pending.status = "simulated_confirmed"
            pending.confirmed_at = timezone.now()
        pending.save(update_fields=["status", "confirmed_at", "updated_at"])
