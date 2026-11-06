from config.schema_types import BOOL, INT, TEXT, UUID, TIME, array, choice, nullable, obj, op, ref

NUMBER = {"type": "number"}
OWNER = {"instance_id": UUID, "lease": {**TEXT, "maxLength": 128}}
SCHEMAS = {
    "PlazaPoint": obj({"x": {**NUMBER, "minimum": 0, "maximum": 1000}, "y": {**NUMBER, "minimum": 0, "maximum": 700}}),
    "PlazaTrajectory": obj({"start": ref("PlazaPoint"), "target": ref("PlazaPoint"), "started_at_ms": NUMBER, "duration_ms": NUMBER, "sequence": INT}),
    "PlazaRoom": obj({"slug": TEXT, "name": TEXT, "area": ref("Area"), "capacity": INT, "width": INT, "height": INT}),
    "PlazaBubble": obj({"id": UUID, "text": {**TEXT, "maxLength": 120}, "expires_at_ms": NUMBER, "offer_id": nullable(UUID)}),
    "PlazaParticipant": obj({"participant_id": UUID, "person": ref("PublicIdentity"), "trajectory": ref("PlazaTrajectory"), "bubble": nullable(ref("PlazaBubble"))}),
    "PlazaSnapshot": obj({"room": ref("PlazaRoom"), "revision": TEXT, "server_time_ms": NUMBER,
        "self": nullable(obj({"participant_id": UUID, "owned": BOOL, "sequence": INT})),
        "participants": {**array(ref("PlazaParticipant")), "maxItems": 40}, "offers": array(ref("DiscoveryOffer")), "own_offers": array(ref("DiscoveryOffer")), "offers_next_cursor": nullable(TEXT)}),
    "PlazaCommand": {"oneOf": [obj({**OWNER, "action": choice(action), **fields}, ["instance_id", "lease", "action", *[key for key in fields if key != "offer_id"]]) for action, fields in (
        ("heartbeat", {}), ("move", {"sequence": {**INT, "minimum": 1, "maximum": 2147483647}, "target": ref("PlazaPoint")}),
        ("stop", {"sequence": INT}), ("bubble", {"body": {**TEXT, "maxLength": 120}, "operation_id": UUID, "offer_id": nullable(UUID)}), ("clear_bubble", {}), ("leave", {}))]},
    "PlazaCommandResult": obj({"recorded": BOOL, "trajectory": ref("PlazaTrajectory"), "server_time_ms": NUMBER}, ["recorded"]),
    "PlazaModeration": obj({"id": UUID, "body": TEXT, "room_slug": TEXT, "author_handle": TEXT, "status": TEXT, "version": INT, "created_at": TIME, "visible_until": TIME, "reports": array(obj({"id": UUID, "reason": TEXT}))}),
}
OPERATIONS = {
    ("RoomsView", "GET"): op(obj({"rooms": array(obj({**SCHEMAS["PlazaRoom"]["properties"], "online": INT}))}), summary="List city rooms and current joined counts"),
    ("JoinView", "POST"): op(obj({"lease": TEXT, "snapshot": ref("PlazaSnapshot")}), obj({"instance_id": UUID, "operation_id": UUID}), summary="Explicitly join or switch a shared city room", description="Publishes public identity and virtual room presence. One owner lease per account; exact join retries cannot reclaim a replacement lease. Keep the lease in memory, never URLs or persisted storage."),
    ("SnapshotView", "GET"): op(ref("PlazaSnapshot"), summary="Read joined room state", description="Authenticated current-room members only. X-Plaza-Instance is a nonsecret browser UUID used to report ownership, never authorization. Locations are virtual positions, not GPS."),
    ("CommandView", "POST"): op(ref("PlazaCommandResult"), ref("PlazaCommand"), summary="Control your character or speech bubble", description="Requires the owner session, instance and opaque lease. Four move commands/sec, stops remain possible, heartbeats every15s; presence expires after60s. Plain Unicode text up to120 code points, one60s bubble, six posts/min. Bubble operation UUIDs must retain exact text/offer on explicit retries. No offline replay or financial decision."),
    ("StreamView", "GET"): op(TEXT, media="text/event-stream", summary="Watch joined room changes", description="Bounded45s; retry:3000. plaza.changed contains revision only; fetch an authorized snapshot. plaza.expired ends unavailable membership. No lease/query credential or full replay. Rechecks session/member/room while connected."),
    ("ReportView", "POST"): op(obj({"id": UUID, "status": TEXT}), obj({"reason": {**TEXT, "maxLength": 2000}}), status=201, summary="Report a room bubble", description="Requires active membership in the bubble's room. Evidence may remain after public expiry. Reporting does not itself suspend or remove a member."),
    ("ModerationQueueView", "GET"): op(obj({"bubbles": array(ref("PlazaModeration")), "limit": INT}), summary="Read reported marketplace bubbles", description="Moderator/admin staff only; maximum100 current open reports. General developer-reference access grants no moderation permission."),
    ("DecisionView", "POST"): op(obj({"id": UUID, "status": TEXT, "version": INT}), obj({"expected_version": INT, "decision": choice("remove", "keep"), "reason": TEXT}), summary="Record an audited bubble moderation decision", description="Moderator/admin, current version and reason required; self-moderation is refused. Keeping expired content never republishes it."),
}
