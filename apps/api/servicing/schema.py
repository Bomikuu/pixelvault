from config.schema_types import BOOL, CENTS, INT, JSON_MAP, TEXT, TIME, UUID, array, nullable, obj, op, ref
SCHEMAS = {
    "Loan": obj({"id": UUID, "status": TEXT, "principal_balance": CENTS, "accrued_interest": CENTS, "projected_interest": CENTS, "total_due": CENTS, "payoff_amount": CENTS, "next_installment_due": CENTS, "next_due_date": nullable({"type": "string", "format": "date"}), "settlement_status": TEXT, "disbursement_status": TEXT, "schedule": array(ref("Installment")), "revised_projection": array(ref("Installment")), "projection_label": TEXT, "terms": ref("Terms"), "disclosure": ref("Disclosure"), "agreement_id": UUID, "lender": ref("Person"), "borrower": ref("Person"), "test_mode": BOOL, "activation_exception": TEXT, "active_amendment_id": nullable(UUID), "original_terms": ref("Terms")}),
}
SCHEMAS["LedgerEvent"] = obj({"id":UUID,"kind":TEXT,"amount":{**INT,"format":"int64"},"principal_delta":{**INT,"format":"int64"},"interest_delta":{**INT,"format":"int64"},"effective_at":TIME,"recorded_at":TIME})
OPERATIONS = {
    ("LoansView", "GET"): op(array(ref("Loan")), summary="List your borrowing and lending records"),
    ("LoanView", "GET"): op(ref("Loan"), summary="Read current obligations and separate future projections", description="Contractual future interest is not earned income. Confirmed collection does not establish settlement to the lender."),
    ("TimelineView", "GET"): op(array(ref("LedgerEvent")), summary="Read the authorized loan timeline"),
    ("LoanPaymentsView", "GET"): op(array(ref("LedgerEvent")), summary="Read this loan's payment records"),
    ("PaymentsView", "GET"): op(array(JSON_MAP), summary="Read your authorized payment records", partial=True),
    ("PeopleView", "GET"): op(array(ref("Person")), summary="Read people associated with your loans"),
    ("DocumentsView", "GET"): op(array(JSON_MAP), summary="Read your loan document index", partial=True),
    ("LoanDocumentsView", "GET"): op(array(JSON_MAP), summary="Read documents for an authorized loan", partial=True),
    ("ReceiptView", "GET"): op({"type": "string", "format": "binary"}, media="application/pdf", summary="Download a confirmed collection receipt"),
    ("LoanCommissionView", "GET"): op(JSON_MAP, summary="Read the separate origination fee record", description="There is no platform commission on repayments.", partial=True),
    ("DisburseView", "POST"): op(obj({"transfer_id":UUID,"loan_id":UUID,"status":TEXT,"test_mode":BOOL}), obj({"operation_id": UUID}), summary="Request test-mode disbursement", description="Simulation only; no real payout provider is approved or enabled."),
}

SCHEMAS["LoanDocument"]=obj({"id":UUID,"title":TEXT,"kind":TEXT,"state":TEXT,"hash":TEXT,"url":TEXT,"created_at":TIME,"test_mode":BOOL},["id","title","kind","state","url","created_at","test_mode"])
for cls in ("DocumentsView","LoanDocumentsView"):
 OPERATIONS[(cls,"GET")]=op(array(ref("LoanDocument")),summary="Read authorized agreements and collection acknowledgments",description="Agreement hashes are included; receipt rows have no hash. URLs require fresh counterparty authorization; no private verification files are exposed.")
OPERATIONS[("PaymentsView","GET")]=op(array(obj({"id":UUID,"loan_id":nullable(UUID),"kind":TEXT,"amount":CENTS,"currency":TEXT,"status":TEXT,"checkout_url":TEXT,"settlement_status":TEXT,"created_at":TIME,"test_mode":BOOL})),summary="Read your payment operations and unresolved settlement state")
OPERATIONS[("LoanCommissionView","GET")]=op(obj({"id":nullable(UUID),"status":TEXT,"amount":CENTS,"collected_amount":CENTS,"policy_version":TEXT,"currency":TEXT,"payer_id":UUID,"checkout_path":TEXT,"test_mode":BOOL},["id","status","amount","collected_amount","currency","payer_id","test_mode"]),summary="Read the lender's separate origination fee",description="No commission is charged on repayments. An absent accrual has id=null and omits policy_version/checkout_path.")
