from decimal import Decimal

import pytest
from config.errors import DomainError

from agreements.disclosures import build_disclosure, effective_annual_rate
from agreements.types import Fee

from .test_schedule import fixture


def test_zero_interest_zero_fee_eir_is_zero():
    assert Decimal(build_disclosure(fixture(annual_rate_bps=0))["effective_annual_rate"]) == 0


def test_borrower_fee_increases_eir():
    base = build_disclosure(fixture())
    charged = build_disclosure(fixture(borrower_fees=(Fee("processing", 10000),)))
    assert charged["net_proceeds"] == 990000
    assert Decimal(charged["effective_annual_rate"]) > Decimal(base["effective_annual_rate"])


def test_lender_fee_never_deducts_borrower_proceeds():
    disclosure = build_disclosure(fixture(lender_fees=(Fee("platform_commission_demo", 20000),)))
    assert disclosure["net_proceeds"] == 1000000
    assert disclosure["lender_fees"][0]["amount"] == 20000


def test_invalid_cashflows_fail_instead_of_zero():
    with pytest.raises(DomainError):
        effective_annual_rate(
            net_proceeds=1000000, start=fixture().effective_date, dated_payments=()
        )
