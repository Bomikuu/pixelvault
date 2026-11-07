from config.schema_types import BOOL, CENTS, INT, TEXT, TIME, UUID, array, nullable, obj, op, parameter, ref

SCHEMAS = {
    "OfferComment": obj({"id": UUID, "body": TEXT, "author": ref("PublicIdentity"), "created_at": TIME, "status": TEXT, "can_delete": BOOL}, ["id", "body", "author", "created_at"]),
    "OfferSocial": obj({"offer_id":UUID,"likes":obj({"count":INT,"liked":BOOL}),"reactions":array(obj({"key":TEXT,"name":TEXT,"count":INT})),"my_reaction":nullable(ref("PublicAward")),"reaction_choices":array(ref("PublicAward")),"comments":array(ref("OfferComment")),"comments_next_cursor":nullable(TEXT)}),
    "CalculatorPreview": obj({"terms": ref("Terms"), "disclosure": ref("Disclosure"), "simulation_only": BOOL, "application_uses_original_terms": BOOL, "original_terms": obj({"frequency": TEXT, "installment_count": INT}), "limits": obj({"min_amount": CENTS, "max_amount": CENTS, "max_installments": INT, "frequencies": array(TEXT)}), "notice": TEXT}),
}
OPERATIONS = {
    ("SocialView", "GET"): op(ref("OfferSocial"), summary="Read offer likes, achievements and comments", parameters=[parameter("cursor", INT, "Comment offset, 0 to 10000.")]),
    ("LikeView", "PUT"): op(obj({"count": INT, "liked": BOOL}), obj({"liked": BOOL}), summary="Set your like on an offer"),
    ("ReactionView", "PUT"): op(ref("OfferSocial"), obj({"award_id": nullable(UUID)}), summary="Leave an eligible achievement reaction"),
    ("CommentView", "POST"): op(ref("OfferComment"), obj({"body": {**TEXT, "maxLength": 1200}, "operation_id": UUID}, ["body", "operation_id"]), status=201, summary="Comment on a public offer"),
    ("CommentDetailView", "DELETE"): op(obj({"deleted": BOOL}), summary="Remove your offer comment", partial=True),
    ("CalculatorView", "GET"): op(ref("CalculatorPreview"), summary="Preview an offer's exact estimated payment schedule", description="Read-only. Variant frequency/count is a simulation, not an amendment to the lender's original application terms. Capacity and policy are rechecked.", parameters=[parameter("principal", {**CENTS,"minimum":1,"example":800000}, "Integer PHP centavos within currently usable capacity.", True), parameter("frequency", {"type": "string", "enum": ["weekly", "twice_monthly", "monthly", "maturity"]}), parameter("installment_count", {"type": "integer", "minimum": 1, "maximum": 24})]),
}

OPERATIONS[("CommentDetailView","DELETE")]["partial"]=False
OPERATIONS[("ReportView","POST")]=op(obj({"id":UUID,"status":TEXT}),obj({"reason":{**TEXT,"maxLength":1000}}),status=201,summary="Report a public offer comment privately")
OPERATIONS[("ModerationQueueView","GET")]=op(obj({"comments":array({"allOf":[ref("OfferComment"),obj({"offer_id":UUID,"version":INT,"reports":array(obj({"id":UUID,"reason":TEXT}))})]})}),summary="Read the independent offer-comment moderation queue",description="Moderator/admin with sensitive step-up; at most 100 comments.",parameters=[parameter("offer_id",UUID)])
OPERATIONS[("ModerationView","POST")]=op({"allOf":[ref("OfferComment"),obj({"version":INT})]},obj({"expected_version":INT,"decision":{"type":"string","enum":["approved","held","rejected"]},"reason":{**TEXT,"maxLength":1000}}),summary="Review an offer comment's current version",description="Independent moderator with step-up. Author and offer owner cannot review their own content.")
