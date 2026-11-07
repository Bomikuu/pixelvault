from config.schema_types import BOOL, CENTS, INT, JSON_MAP, TEXT, TIME, UUID, array, choice, nullable, obj, op, ref
SCHEMAS = {
    "MeetingSummary": obj({"id": UUID, "kind": choice("investment", "borrowing"), "state": TEXT, "revision": INT, "event_sequence": INT, "offer": obj({"id": UUID, "title": TEXT}), "lender": ref("Person"), "participant": ref("Person"), "scheduled_at": nullable(TIME), "amount": CENTS, "created_at": TIME}),
    "Meeting": {"allOf": [ref("MeetingSummary"), obj({"agenda": choice("funding", "earnings", "documents"), "proposal": obj({"amount":CENTS,"share_bps":INT,"basis":TEXT,"risk_model":TEXT,"fee_policy":obj({"bps":INT,"version":TEXT,"payer":TEXT,"timing":TEXT}),"terms":ref("Terms"),"disclosure":ref("Disclosure")},["amount"]), "proposal_version": INT, "proposal_hash": TEXT, "schedule_version": INT, "participants": array({"allOf": [ref("Person"), obj({"role": TEXT, "schedule_accepted": BOOL, "checked_in": BOOL, "here": BOOL, "in_lobby": BOOL, "last_seen_label": TEXT})]}), "both_here": BOOL, "both_approved": BOOL, "approved_by": array(UUID), "evidence_hash": TEXT, "evidence_reviewed": BOOL, "evidence_reviewed_by": array(UUID), "visibility": choice("named", "anonymous"), "test_mode": BOOL, "application_id": nullable(UUID), "agreement": nullable(ref("Agreement")), "loan_id": nullable(UUID), "thread_id": UUID, "messages": array(obj({"id": UUID, "body": TEXT, "sender": ref("Person"), "created_at": TIME})), "earlier_messages_available": BOOL, "events": array(obj({"id": UUID, "sequence": INT, "kind": TEXT, "actor": TEXT, "created_at": TIME})), "evidence": array(obj({"id": UUID, "owner_id": UUID, "owner_name": TEXT, "name": TEXT, "category": TEXT, "file_status": TEXT, "authenticity": TEXT, "created_at": TIME})), "funding": obj({"status": TEXT, "confirmed_amount": CENTS, "blockers": array(TEXT)}), "calls": obj({"available": BOOL, "reason": TEXT}), "eligibility": obj({"lender_identity": TEXT, "participant_identity": TEXT, "note": TEXT}), "investment": nullable(ref("InvestmentAgreement")), "pings": obj({"last_sent_at": nullable(TIME), "next_allowed_at": nullable(TIME), "last_received_at": nullable(TIME), "from_name": nullable(TEXT)}), "server_time": TIME})]},
}
OPERATIONS = {
    ("RoomsView", "GET"): op(obj({"rooms": array(ref("MeetingSummary")), "limit": INT}), summary="Read your private meetings"),
    ("RoomsView", "POST"): op(obj({"id": UUID}), obj({"kind": choice("investment", "borrowing"), "offer_id": UUID, "amount": CENTS, "operation_id": UUID, "application_id": UUID, "share_bps": {**INT,"minimum":0,"maximum":10000}}, ["kind", "offer_id", "operation_id"]), status=201, summary="Propose a private agreement meeting", partial=True),
    ("RoomView", "GET"): op(ref("Meeting"), summary="Read a participant-only room snapshot", partial=True),
    ("RoomView", "POST"): op(ref("Meeting"), obj({"action": TEXT, "operation_id": UUID, "expected_revision": INT}, ["action"]), summary="Submit a room command", description="Commands have different required payloads and attendance requirements. A stale expected_revision is a conflict. Consult the meeting guide and source for action-specific fields; this contract is partial.", partial=True),
    ("RoomStreamView", "GET"): op(TEXT, media="text/event-stream", summary="Watch participant-only room changes", description="45-second stream; reconnect after retry:3000. room.changed supplies sequence/revision, room.expired ends an expired session; comments are heartbeats. Fetch a fresh snapshot after a change. No full event replay is promised."),
    ("EvidenceView", "POST"): op(obj({"id": UUID, "status": TEXT}), {"multipart/form-data": obj({"file": {"type": "string", "format": "binary"}, "category": choice("redacted_evidence", "transfer_proof"), "consent": choice("share_with_counterparty")})}, status=201, summary="Share consented redacted meeting evidence", description="Test mode only. PDF, PNG or JPEG. An upload is not proof of authenticity or settlement."),
    ("EvidenceContentView", "GET"): op({"type": "string", "format": "binary"}, media=["application/pdf","image/png","image/jpeg"], summary="Download clean participant-shared evidence", description="Actual Content-Type is the validated PDF, PNG or JPEG type. Quarantined or revoked files cannot be downloaded."),
    ("EvidenceContentView", "DELETE"): op(obj({"revoked": BOOL}), summary="Revoke your shared evidence"),
    ("RoomCallView", "GET"): op(JSON_MAP, summary="Read current ephemeral room call state", partial=True),
    ("RoomCallView", "POST"): op(JSON_MAP, summary="Request or respond to a participant-only call", description="Mutual participation is required. Capture is optional; no recording. SDP is ephemeral. See source for action variants.", partial=True),
}

COMMANDS = {}
def command(name, fields=None, ephemeral=False):
    props={"action": {"type":"string","enum":[name]},"operation_id":UUID,**(fields or {})}
    if not ephemeral: props["expected_revision"]=INT
    schema=obj(props)
    COMMANDS[name]=schema
    SCHEMAS["RoomCommand"+"".join(x.title() for x in name.split("_"))]=schema
for action in ("heartbeat","lobby_heartbeat","leave","ping"): command(action,ephemeral=True)
for action in ("message","counter"): command(action,{"body":TEXT},ephemeral=True)
command("schedule",{"scheduled_at":TIME})
for action in ("accept_schedule","check_in","prepare","close"): command(action)
command("agenda",{"agenda":choice("funding","earnings","documents")})
command("propose",{"amount":CENTS,"share_bps":INT})
for action in ("approve","review_evidence"): command(action,{"expected_hash":TEXT})
command("accept_contract",{"accepted":BOOL,"expected_hash":TEXT})
command("confirm_test_funding",{"confirmed_simulation":BOOL,"expected_hash":TEXT})
command("prepare_payout",{"confirmed_simulation":BOOL,"return_unallocated":BOOL})
for action in ("confirm_payout","cancel_payout"): command(action,{"confirmed_simulation":BOOL,"payout_id":UUID})
command("visibility",{"visibility":choice("named","anonymous")})
OPERATIONS[("RoomView","POST")]["request"]={"oneOf":[ref("RoomCommand"+"".join(x.title() for x in name.split("_"))) for name in COMMANDS],"discriminator":{"propertyName":"action"}}
OPERATIONS[("RoomView","POST")]["description"]="Every action needs operation_id. Except heartbeat/lobby_heartbeat/leave/ping/message/counter, commands require expected_revision. Exact uncertain retries must reuse the same body and operation ID. Approval, contract acceptance, funding and payout are separate. Schedule, agenda, propose and prepare are lender-only. Confirmation requires current mutual attendance. Consult the guide for action-specific hashes and state rules."
# share_bps is required for investment proposals and omitted for borrowing ones.
COMMANDS["propose"]["required"].remove("share_bps")

SCHEMAS["CallDescription"]=obj({"type":choice("offer","answer"),"sdp":{**TEXT,"minLength":1,"maxLength":65536,"description":"Ephemeral negotiated SDP; never log or persist in client storage."}})
SCHEMAS["RoomCall"]=obj({"available":BOOL,"relay_configured":BOOL,"ice_servers":array(obj({"urls":array(TEXT),"username":TEXT,"credential":{**TEXT,"description":"Short-lived participant-bound relay credential. Do not log or persist."}})),"call":nullable(obj({"id":UUID,"caller_id":UUID,"state":choice("ringing","active","ended"),"offer":nullable(ref("CallDescription")),"answer":nullable(ref("CallDescription"))})),"note":TEXT})
OPERATIONS[("RoomCallView","GET")]=op(ref("RoomCall"),summary="Read participant-only ephemeral call state")
OPERATIONS[("RoomCallView","POST")]=op(ref("RoomCall"),{"oneOf":[obj({"action":choice("invite")}),obj({"action":choice("accept","decline","end","heartbeat"),"call_id":UUID}),obj({"action":choice("description"),"call_id":UUID,"description":ref("CallDescription")})],"discriminator":{"propertyName":"action"}},summary="Request or respond to an optional private browser call",description="Both people must be checked in and present. Callee accepts a ringing invitation; caller sends offer, callee sends answer. Calls expire on stale attendance/heartbeat or closed room. No recording; no operation ID/revision is used for this ephemeral protocol.")
OPERATIONS[("RoomsView","POST")]["request"]={"oneOf":[obj({"kind":choice("borrowing"),"offer_id":UUID,"application_id":UUID,"operation_id":UUID}),obj({"kind":choice("investment"),"offer_id":UUID,"amount":{**CENTS,"minimum":10000},"share_bps":{**INT,"minimum":0,"maximum":10000},"operation_id":UUID})],"discriminator":{"propertyName":"kind"}}
OPERATIONS[("RoomsView","POST")]["partial"]=False
OPERATIONS[("RoomView","GET")]["partial"]=False
OPERATIONS[("RoomView","POST")]["partial"]=False
SCHEMAS["Meeting"]["allOf"][1]["properties"]["proposal"]["properties"].update({"allocation_policy":TEXT,"capital_return":TEXT})
