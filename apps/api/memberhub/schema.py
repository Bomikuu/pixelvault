from config.schema_types import BOOL, DATE, INT, MONEY_STRING, TEXT, TIME, UUID, array, nullable, obj, op, parameter, ref

SCHEMAS = {
    "ActionUpdate": obj({"key": TEXT, "kind": TEXT, "title": TEXT, "detail": TEXT, "href": TEXT, "at": TIME, "urgent": BOOL, "read": BOOL}),
    "CalendarEvent": obj({"id": TEXT, "loan_id": UUID, "sequence": INT, "due_date": DATE, "amount": MONEY_STRING, "covered": MONEY_STRING, "remaining": MONEY_STRING, "status": {"type": "string", "enum": ["covered", "overdue", "partial", "scheduled"]}, "person": ref("Person"), "href": TEXT, "updated_at": TIME}),
    "SavedOffer": obj({"id": UUID, "saved_at": TIME, "available": BOOL, "offer": nullable(ref("Offer"))}),
}
PERIOD = [parameter("start", DATE, "Inclusive date in Asia/Manila."), parameter("end", DATE, "Exclusive date, within 366 days of start."), parameter("role", {"type": "string", "enum": ["borrower", "lender"]})]
OPERATIONS = {
    ("ActionsView", "GET"): op(obj({"actions": array(ref("ActionUpdate")), "unread": INT, "limit": INT, "server_time": TIME}), summary="Read your private action center"),
    ("ActionsView", "POST"): op(ref("Recorded"), obj({"keys": {"type": "array", "maxItems": 200, "items": TEXT}}), summary="Mark displayed action updates as read"),
    ("ThreadReadView", "POST"): op(ref("Recorded"), obj({"through": TIME}), summary="Record your private message read timestamp", description="Timestamp must be no later than server time. This does not change the other participant's read state."),
    ("SavedOffersView", "GET"): op(obj({"saved": array(ref("SavedOffer")), "limit": INT}), summary="Read your saved offers"),
    ("SavedOfferView", "PUT"): op(obj({"saved": BOOL}), obj({"saved": BOOL}), summary="Save or remove an offer", description="Up to 50 current saved offers. PUT sets a desired state; it is not a toggle."),
    ("CalendarView", "GET"): op(obj({"events": array(ref("CalendarEvent")), "start": DATE, "end": DATE, "timezone": TEXT, "role": TEXT, "loan_limit": INT, "notice": TEXT}), summary="Read contractual payment dates", parameters=PERIOD),
    ("CalendarExportView", "GET"): op(TEXT, summary="Download a dates-only private calendar", parameters=PERIOD, media="text/calendar", description="Attachment excludes people, amounts and credentials. Re-export after schedule changes. Covered dates are omitted."),
    ("DecisionsView", "GET"): op(obj({"applications": array(obj({"id": UUID, "title": TEXT, "offer_title": TEXT, "borrower": ref("Person"), "amount": MONEY_STRING, "status": TEXT, "created_at": TIME, "reservation_expires_at": nullable(TIME), "offer_expires_at": TIME, "href": TEXT})), "meetings": array(obj({"id": UUID, "person": ref("Person"), "title": TEXT, "scheduled_at": nullable(TIME), "state": TEXT, "href": TEXT})), "limit": INT, "server_time": TIME}), summary="Read your lender decisions queue"),
}
