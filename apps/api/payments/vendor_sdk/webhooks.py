import hashlib
import hmac
import json
import re
import time


def verify_webhook(raw_body, signature, secret, *, now=None, tolerance=300, event_id=None):
    body = raw_body.encode() if isinstance(raw_body, str) else raw_body
    match = re.fullmatch(r"t=(\d+),v1=([a-f0-9]{64})", signature or "")
    if (
        not match
        or tolerance < 0
        or abs((time.time() if now is None else now) - int(match[1])) > tolerance
    ):
        raise ValueError("Invalid or expired event signature.")
    try:
        event = json.loads(body)
    except (ValueError, UnicodeError):
        raise ValueError("Invalid event body.") from None
    if (
        not isinstance(event, dict)
        or not isinstance(event.get("id"), str)
        or (event_id and event_id != event["id"])
    ):
        raise ValueError("Event identity mismatch.")
    signed = event["id"].encode() + b"." + match[1].encode() + b"." + body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, match[2]):
        raise ValueError("Invalid event signature.")
    if (
        event.get("api_version") != "2026-10-24"
        or event.get("environment") not in {"test", "live"}
        or not isinstance(event.get("type"), str)
        or not isinstance(event.get("data"), dict)
        or type(event["data"].get("amount")) is not int
        or not 0 < event["data"]["amount"] <= 9007199254740991
    ):
        raise ValueError("Unsupported event contract.")
    return event
