import json
import time
from django.contrib.sessions.models import Session
from django.db import close_old_connections
from django.utils import timezone
from config.errors import DomainError
from .presence import room_state, revoke_session
from .projections import stream_revision


def room_events(*, actor_id, session_key, room_slug, clock=time.monotonic, pause=time.sleep):
    started, revision = clock(), None
    try:
        yield "retry: 3000\n\n"
        while clock()-started < 45:
            close_old_connections()
            if not Session.objects.filter(session_key=session_key, expire_date__gt=timezone.now()).exists():
                revoke_session(actor_id, session_key)
                yield 'event: plaza.expired\ndata: {"reason":"session_expired"}\n\n'
                return
            state = room_state(actor_id=actor_id, session_key=session_key, room_slug=room_slug)
            current = stream_revision(state, room_slug)
            if current != revision:
                revision = current
                yield f"event: plaza.changed\ndata: {json.dumps({'revision': current})}\n\n"
            else:
                yield ": keep-alive\n\n"
            pause(1)
    except DomainError:
        yield 'event: plaza.expired\ndata: {"reason":"membership_unavailable"}\n\n'
    finally:
        close_old_connections()
