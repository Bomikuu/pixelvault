import json
import uuid
import pytest
from django.test import Client
from plaza.projections import snapshot

pytestmark=pytest.mark.django_db(transaction=True)


def test_snapshot_excludes_private_owner_fields(owner,members):
    state=snapshot(actor_id=owner["actor_id"],session_key=owner["session_key"],room_slug=owner["room_slug"],instance_id=owner["instance_id"])
    assert set(state["self"]) == {"participant_id","owned","sequence"}
    assert "lease" not in state["participants"][0]
    serialized=json.dumps(state)
    assert owner["lease"] not in serialized
    assert owner["session_key"] not in serialized
    assert members[0].email not in serialized


def test_guest_cannot_read_participants_or_join(client,store):
    assert client.get("/api/v1/plaza/rooms").status_code == 200
    assert client.get("/api/v1/plaza/rooms/manila-01").status_code == 403
    assert client.post("/api/v1/plaza/rooms/manila-01/join",data=json.dumps({"instance_id":str(uuid.uuid4()),"operation_id":str(uuid.uuid4())}),content_type="application/json").status_code == 403


def test_csrf_required_for_join(members,store):
    client=Client(enforce_csrf_checks=True);client.force_login(members[0])
    response=client.post("/api/v1/plaza/rooms/manila-01/join",data=json.dumps({"instance_id":str(uuid.uuid4()),"operation_id":str(uuid.uuid4())}),content_type="application/json")
    assert response.status_code == 403


def test_nonstaff_cannot_review_reports(client,members,store):
    client.force_login(members[0])
    assert client.get("/api/v1/admin/plaza/bubbles").status_code == 403
