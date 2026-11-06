import hashlib
import json
import secrets
import uuid
from django.contrib.auth import get_user_model
from config.errors import DomainError
from .rooms import room_for
from .store import get_store


def active(actor_id):
    try:
        return get_user_model().objects.get(pk=actor_id, is_active=True, suspended=False)
    except get_user_model().DoesNotExist:
        raise DomainError("member_unavailable", "Sign in with an active account to join a room.", 403) from None


def binding(session_key):
    if not session_key:
        raise DomainError("session_expired", "Sign in again before joining a room.", 403)
    return hashlib.sha256(session_key.encode()).hexdigest()


def join(*, actor_id, session_key, instance_id, room_slug, operation_id):
    active(actor_id)
    room_for(room_slug)
    data = {"room_slug": room_slug, "instance_id": str(instance_id), "session_binding": binding(session_key)}
    data["fingerprint"] = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    return get_store().run("join", actor_id, **data, operation_id=str(operation_id), lease=secrets.token_urlsafe(32), participant_id=str(uuid.uuid4()), spawn={"x": 220 + secrets.randbelow(560), "y": 220 + secrets.randbelow(260)})


def room_state(*, actor_id, session_key, room_slug):
    active(actor_id)
    room_for(room_slug)
    state = public_state(room_slug)
    own = next((m for m in state["members"] if m["member_id"] == str(actor_id)), None)
    if not own or own["session_binding"] != binding(session_key):
        raise DomainError("lease_lost", "Join this city room to see its people and bubbles.", 409)
    return state


def public_state(room_slug):
    room_for(room_slug)
    result = get_store().run("read", room_slug=room_slug)
    members = result["members"]
    ids = [m["member_id"] for m in members]
    valid = set(str(pk) for pk in get_user_model().objects.filter(pk__in=ids, is_active=True, suspended=False).values_list("pk", flat=True))
    for m in members:
        if m["member_id"] not in valid:
            get_store().run("revoke", m["member_id"])
    result["members"] = [m for m in members if m["member_id"] in valid]
    return result


def control(*, actor_id, session_key, room_slug, instance_id, lease, action, **payload):
    active(actor_id)
    room_for(room_slug)
    return get_store().run(action, actor_id, room_slug=room_slug, instance_id=str(instance_id), lease=lease, session_binding=binding(session_key), **payload)


def revoke_actor(actor_id):
    return get_store().run("revoke", actor_id)


def revoke_session(actor_id, session_key):
    if session_key:
        return get_store().run("revoke", actor_id, session_binding=binding(session_key))
