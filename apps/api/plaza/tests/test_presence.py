from concurrent.futures import ThreadPoolExecutor
import uuid
import pytest
from config.errors import DomainError
from .conftest import joined


def test_capacity_is_atomic_across_workers(store):
    def attempt(_):
        try:
            joined(store)
            return "joined"
        except DomainError as e:
            return str(e.detail["code"])
    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(attempt, range(41)))
    assert results.count("joined") == 40
    assert results.count("room_full") == 1


def test_join_retry_cannot_reclaim_replacement(store):
    actor, data, old = joined(store)
    assert store.run("join", actor, **data)["membership"]["lease"] == old["lease"]
    _, _, replacement = joined(store, actor)
    with pytest.raises(DomainError) as caught:
        store.run("join", actor, **data)
    assert caught.value.detail["code"] == "lease_lost"
    with pytest.raises(DomainError):
        store.run("leave", actor, **{k:old[k] for k in ("room_slug","instance_id","session_binding","lease")})
    assert store.run("read", room_slug="manila-01")["members"][0]["lease"] == replacement["lease"]


def test_rejected_switch_preserves_previous_room(store):
    actor, _, old = joined(store)
    for _ in range(40):
        joined(store, room_slug="pasig-01")
    with pytest.raises(DomainError):
        joined(store, actor, room_slug="pasig-01")
    assert store.run("read", room_slug="manila-01")["members"][0]["lease"] == old["lease"]


def test_stop_after_move_limit(store):
    actor, _, m = joined(store)
    owner = {k:m[k] for k in ("room_slug","instance_id","session_binding","lease")}
    for sequence in range(1,5):
        store.run("move", actor, **owner, sequence=sequence, target={"x":900,"y":600})
    result = store.run("stop", actor, **owner, sequence=5)["membership"]["trajectory"]
    assert result["start"] == result["target"]
    assert result["duration_ms"] == 0


def test_stale_sequence_never_overwrites_newer_stop(store):
    actor, _, m = joined(store)
    owner = {k:m[k] for k in ("room_slug","instance_id","session_binding","lease")}
    store.run("stop", actor, **owner, sequence=3)
    with pytest.raises(DomainError):
        store.run("move", actor, **owner, sequence=2, target={"x":100,"y":100})
    assert store.run("read", room_slug="manila-01")["members"][0]["trajectory"]["sequence"] == 3
