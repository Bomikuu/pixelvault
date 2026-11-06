import hashlib
import json
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import F
from community.profiles import public_identity
from community.search import search_offers
from .rooms import ROOMS, room_for
from .presence import room_state, public_state
from .bubbles import visible_bubbles, eligible_offers


def summaries():
    return {"rooms": [{**room, "online": len(public_state(slug)["members"])} for slug, room in ROOMS.items()]}


def snapshot(*, actor_id, session_key, room_slug, instance_id=None):
    state = room_state(actor_id=actor_id, session_key=session_key, room_slug=room_slug)
    ids = [m["member_id"] for m in state["members"]]
    people = {str(m.pk): m for m in get_user_model().objects.filter(pk__in=ids).select_related("community_settings")}
    bubbles = visible_bubbles([m["bubble_id"] for m in state["members"] if m.get("bubble_id")], timezone.now())
    available = set(str(pk) for pk in eligible_offers().filter(area=room_for(room_slug)["area"]["name"], pk__in=[b.offer_id for b in bubbles.values() if b.offer_id]).values_list("pk", flat=True))
    participants = []
    own = None
    for m in state["members"]:
        if m["member_id"] == str(actor_id):
            own = {"participant_id": m["participant_id"], "owned": m["instance_id"] == str(instance_id), "sequence": m["trajectory"]["sequence"]}
        b = bubbles.get(m.get("bubble_id"))
        participants.append({"participant_id": m["participant_id"], "person": public_identity(people[m["member_id"]]), "trajectory": m["trajectory"],
            "bubble": {"id": str(b.id), "text": b.body, "expires_at_ms": int(b.visible_until.timestamp()*1000), "offer_id": str(b.offer_id) if str(b.offer_id) in available else None} if b else None})
    discovery = search_offers(viewer_id=actor_id, filters={"area": room_for(room_slug)["area"]["name"]})
    return {"room": room_for(room_slug), "revision": str(state["revision"]), "server_time_ms": state["server_time_ms"], "self": own,
        "participants": participants, "offers": discovery["offers"], "own_offers": search_offers(viewer_id=actor_id, lender_id=actor_id, filters={"area": room_for(room_slug)["area"]["name"]})["offers"], "offers_next_cursor": discovery["next_cursor"]}


def stream_revision(state, room_slug):
    from .models import Bubble
    ids = [m["bubble_id"] for m in state["members"] if m.get("bubble_id")]
    bubble_facts = list(Bubble.objects.filter(pk__in=ids, status="visible", visible_until__gt=timezone.now()).values_list("id", "version", "visible_until"))
    offer_facts = list(eligible_offers().filter(area=room_for(room_slug)["area"]["name"]).annotate(available=F("declared_amount")-F("reserved_amount")-F("committed_amount")).order_by("id").values_list("id", "version", "available")[:1000])
    return hashlib.sha256(json.dumps([state["revision"], bubble_facts, offer_facts], default=str).encode()).hexdigest()
