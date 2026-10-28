import uuid

import pytest
from accounts.models import Member
from agreements.schedule import generate_due_dates
from agreements.types import Fee, LoanTerms
from django.utils import timezone

from marketplace.applications import apply_to_offer
from marketplace.offers import publish_offer


@pytest.fixture
def eligible(monkeypatch, db):
    from eligibility.models import ProductPolicy

    ProductPolicy.objects.get_or_create(
        version="demo-v1",
        defaults={
            "environment": "test",
            "approved": True,
            "evidence_ref": "synthetic test fixture",
            "rules": {
                "min_principal": 10000,
                "max_principal": 10000000,
                "max_annual_rate_bps": 2400,
                "max_installments": 24,
                "allowed_frequencies": ["weekly", "twice_monthly", "monthly", "maturity"],
                "commission_bps": 200,
            },
        },
    )
    monkeypatch.setattr(
        "eligibility.services.check_eligibility",
        lambda **kwargs: {"allowed": True, "reasons": [], "policy_version": "demo-v1"},
    )


@pytest.fixture
def members(db):
    return tuple(
        Member.objects.create_user(
            username=name, email=f"{name}@example.test", password=None, display_name=name.title()
        )
        for name in ("lender", "borrower", "other")
    )


@pytest.fixture
def terms():
    effective = timezone.localdate()
    return LoanTerms(
        1000000,
        "PHP",
        1200,
        "monthly",
        3,
        effective,
        generate_due_dates(effective_date=effective, frequency="monthly", count=3),
        lender_fees=(Fee("platform_commission_demo", 20000),),
    )


@pytest.fixture
def offer(members, terms, eligible):
    return publish_offer(
        lender_id=members[0].id, terms=terms, declared_amount=1000000, operation_id=uuid.uuid4()
    )


@pytest.fixture
def application(offer, members):
    return apply_to_offer(
        borrower_id=members[1].id,
        offer_id=offer.id,
        principal=1000000,
        operation_id=uuid.uuid4(),
        purpose="Synthetic test purpose",
        summary={"employment_type": "freelancer", "private_document": "must never be stored"},
    )
