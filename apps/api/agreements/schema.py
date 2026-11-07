from config.schema_types import BOOL, DATE, INT, TEXT, TIME, UUID, array, nullable, obj, op, ref
SCHEMAS = {
    "Agreement": obj({"id": UUID, "state": TEXT, "hash": TEXT, "version": INT, "terms": ref("Terms"), "disclosure": ref("Disclosure"), "lender": ref("Person"), "borrower": ref("Person"), "acceptances": array(obj({"member_id": UUID, "accepted_at": TIME, "hash": TEXT, "provenance": TEXT})), "test_mode": BOOL, "template_version": TEXT, "expires_at": TIME, "loan_id": nullable(UUID)}),
}
OPERATIONS = {
    ("AgreementsView", "GET"): op(array(ref("Agreement")), summary="List agreements where you are a counterparty"),
    ("AgreementView", "GET"): op(ref("Agreement"), summary="Review frozen agreement terms and acceptances"),
    ("AcceptView", "POST"): op(obj({"agreement_id": UUID, "loan_id": nullable(UUID), "state": TEXT}), obj({"expected_hash": TEXT, "operation_id": UUID}), summary="Accept the exact current agreement hash", description="Both parties must independently accept. This does not confirm disbursement. A changed hash requires fresh review."),
    ("DocumentView", "GET"): op({"type": "string", "format": "binary"}, media="application/pdf", summary="Download your agreement PDF"),
    ("RenewEffectiveDateView", "POST"): op(ref("Agreement"), obj({"effective_date": DATE, "operation_id": UUID}), status=201, summary="Create a replacement agreement with a new effective date"),
}
