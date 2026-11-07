from config.schema_types import BOOL, INT, TEXT, TIME, UUID, array, choice, nullable, obj, op, ref

SCHEMAS = {
    "VerificationCase": obj({"id": UUID, "member_id": UUID, "member_name": TEXT, "member": {"allOf": [ref("PublicIdentity"), obj({"id": UUID})]}, "kind": TEXT, "status": TEXT, "reason": TEXT, "expires_at": nullable(TIME), "version": INT, "provenance": TEXT, "document_id": nullable(UUID)}),
    "LenderRegistration": obj({"id": UUID, "status": TEXT, "authority": TEXT, "evidence_ref": TEXT, "reason": TEXT, "version": INT, "legal_authorization": BOOL}),
}
REVIEW = obj({"expected_version": INT, "outcome": choice("approved","rejected","needs_information"), "reason": TEXT})
OPERATIONS = {
    ("VerificationView", "GET"): op(obj({"cases": array(ref("VerificationCase")), "required_checks": array(TEXT), "environment": TEXT}), summary="Read your private verification checks"),
    ("VerificationView", "POST"): op(ref("VerificationCase"), obj({"kind": choice("identity", "income", "contact", "funding_account"), "document_id": UUID, "notes": {**TEXT, "maxLength": 500}}, ["kind"]), status=201, summary="Submit a verification check", description="Identity, income and funding-account checks require an owned private document. A submitted case is not approved. Duplicate pending checks return 409."),
    ("RegistrationView", "GET"): op(ref("LenderRegistration"), summary="Read your lender evidence registration", description="May initialize an empty record. Evidence review never establishes legal authorization."),
    ("RegistrationView", "POST"): op(ref("LenderRegistration"), obj({"authority": TEXT, "evidence_ref": TEXT}), summary="Submit lender registration evidence"),
    ("ReviewQueueView", "GET"): op(array(ref("VerificationCase")), summary="List assigned verification cases", description="Reviewer sees assigned cases; admin sees all. Maximum 100."),
    ("ReviewView", "GET"): op(ref("VerificationCase"), summary="Read an assigned private verification case"),
    ("ReviewView", "POST"): op(ref("VerificationCase"), REVIEW, summary="Review a verification check"),
    ("RegistrationReviewView", "GET"): op({"allOf": [ref("LenderRegistration"), obj({"member_id": UUID, "member_name": TEXT})]}, summary="Read a lender registration as reviewer"),
    ("RegistrationReviewView", "POST"): op(ref("LenderRegistration"), obj({"expected_version": INT, "outcome": choice("evidence_reviewed", "needs_information", "rejected", "suspended", "revoked"), "reason": TEXT}), summary="Decide a lender evidence review", description="Reviewer/admin, recent sensitive step-up and current version required. This does not authorize lending under law."),
}
