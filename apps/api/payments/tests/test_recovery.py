import copy
import uuid

import pytest
from config.errors import DomainError

from payments.models import EventInbox, FinancialSource
from payments.recovery import recover_events

pytestmark = pytest.mark.django_db


def test_paginated_recovery_checkpoint_replay_safe(event, routing, httpx_mock):
    twin = copy.deepcopy(event)
    twin["id"] = str(uuid.uuid4())
    httpx_mock.add_response(
        url="http://localhost:8000/api/v1/events?limit=100&offset=0",
        json={
            "count": 2,
            "results": [event],
            "next": "http://localhost:8000/api/v1/events?limit=100&offset=1",
            "previous": None,
        },
    )
    httpx_mock.add_response(
        url="http://localhost:8000/api/v1/events?limit=100&offset=1",
        json={
            "count": 2,
            "results": [twin],
            "next": None,
            "previous": "http://localhost:8000/api/v1/events?limit=100",
        },
    )
    result = recover_events(routing_id=routing.id, cursor="0")
    assert result.processed == 2 and not result.has_more and result.cursor == "0"
    assert EventInbox.objects.count() == 2
    assert FinancialSource.objects.count() == 1


def test_recovery_never_follows_foreign_pagination_url(event, routing, httpx_mock):
    httpx_mock.add_response(
        url="http://localhost:8000/api/v1/events?limit=100&offset=0",
        json={
            "count": 2,
            "results": [event],
            "next": "https://untrusted.example/events?limit=100&offset=1",
            "previous": None,
        },
    )
    with pytest.raises(DomainError) as error:
        recover_events(routing_id=routing.id, cursor="0")
    assert error.value.detail["code"] == "recovery_pagination_scope"
    assert len(httpx_mock.get_requests()) == 1
