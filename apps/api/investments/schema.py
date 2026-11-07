from config.schema_types import BOOL, CENTS, INT, MONEY_STRING, TEXT, TIME, UUID, array, choice, nullable, obj, op, ref

SCHEMAS = {
    "InvestmentPosition": obj({**{key: MONEY_STRING for key in ("contributed", "allocated", "unallocated", "principal_collected", "earnings", "principal_returned", "earnings_paid", "principal_due", "earnings_due", "recorded_loss", "capital_exposure", "platform_fee")}, "simulated": BOOL}),
    "InvestmentPayout": obj({"id": UUID, "principal": MONEY_STRING, "earnings": MONEY_STRING, "unused_capital": MONEY_STRING, "status": TEXT, "created_at": TIME, "confirmed_at": nullable(TIME)}),
    "InvestmentFund": obj({"id": UUID, "status": TEXT, "confirmed_at": TIME, "position": ref("InvestmentPosition"), "payouts": array(ref("InvestmentPayout")), "allocations": array(obj({"id": UUID, "loan_reference": TEXT, "amount": MONEY_STRING, "status": TEXT}))}),
    "InvestmentAgreement": obj({"id": UUID, "hash": TEXT, "terms": ref("InvestmentTerms"), "body": TEXT, "accepted": BOOL, "approvals": array(obj({"member_id": UUID, "kind": TEXT, "created_at": TIME})), "fund": nullable(ref("InvestmentFund")), "download_url": TEXT}),
}
OPERATIONS = {
    ("PortfolioView", "GET"): op(obj({"funds": array({"allOf": [ref("InvestmentFund"), obj({"role": choice("investor", "lender"), "person": ref("Person"), "offer_title": TEXT, "room_id": UUID, "share_bps": INT})]}), "test_mode": BOOL, "limit": INT, "notice": TEXT}), summary="Read your private test investment positions", description="At most 100 funds; payouts at most 20 and allocations at most 100 per fund. Exact centavo strings; collections do not prove lender settlement. No withdrawable wallet balance."),
    ("InvestmentDocumentView", "GET"): op(TEXT, media="text/plain", summary="Download the frozen test investment agreement", description="Participant-only, private/no-store. Contains full contract body, SHA-256 and recorded acknowledgments. Downloading does not accept."),
    ("PublicInvestorsView", "GET"): op(obj({"people": array(obj({"anonymous": BOOL, "person": nullable(ref("Person"))})), "total": INT, "more": INT, "capped": BOOL, "test_mode": BOOL}), summary="Read public contributor circles on an available offer", description="Up to five unique people; any anonymous contribution keeps that person's circle anonymous. Individual amounts and private positions never appear."),
}

SCHEMAS["InvestmentTerms"]=obj({"amount":CENTS,"share_bps":INT,"basis":TEXT,"risk_model":TEXT,"fee_policy":obj({"bps":INT,"version":TEXT,"payer":TEXT,"timing":TEXT}),"allocation_policy":TEXT,"capital_return":TEXT,"lender_id":UUID,"investor_id":UUID,"offer_id":UUID,"room_id":UUID,"currency":choice("PHP"),"platform_fee":CENTS,"test_mode":BOOL,"template_version":TEXT})
