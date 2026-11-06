"""Release coverage only during the visual-only implementation; not executed."""
import os
import uuid
import pytest
import redis
from plaza.store import RoomStore
from marketplace.tests.conftest import members, eligible, terms, offer  # noqa: F401


@pytest.fixture
def store(monkeypatch):
    url = os.getenv("PLAZA_TEST_REDIS_URL")
    if not url:
        pytest.skip("Configure dedicated PLAZA_TEST_REDIS_URL for real shared-store tests.")
    client = redis.Redis.from_url(url, decode_responses=True)
    prefix = f"pixelvault:test:plaza:{uuid.uuid4()}:"
    instance = RoomStore(client, prefix)
    monkeypatch.setattr("plaza.presence.get_store", lambda: instance)
    yield instance
    keys = list(client.scan_iter(match=prefix+"*"))
    if keys:
        client.delete(*keys)


def joined(store, actor=None, **changes):
    actor = actor or str(uuid.uuid4())
    data = dict(room_slug="manila-01", instance_id=str(uuid.uuid4()), session_binding="synthetic-session",
        operation_id=str(uuid.uuid4()), fingerprint="synthetic-payload", lease=str(uuid.uuid4()), participant_id=str(uuid.uuid4()), spawn={"x":500,"y":350})
    data.update(changes)
    return actor, data, store.run("join", actor, **data)["membership"]


@pytest.fixture
def owner(store, members):
    from plaza.presence import join
    data = {"actor_id":members[0].id,"session_key":"synthetic-session","instance_id":uuid.uuid4(),"room_slug":"quezon-city-01"}
    result = join(**data, operation_id=uuid.uuid4())
    return {**data,"lease":result["membership"]["lease"]}
