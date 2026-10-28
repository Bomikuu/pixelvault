"""Coarse, opt-in activity; never publish an exact browsing timestamp."""

from datetime import timedelta
from django.utils import timezone


def activity_summary(member):
    return coarse_activity(member.last_active_at)


def coarse_activity(at):
    if not at:
        return {"state": "unknown", "label": "Last online unavailable"}
    age = max(0, (timezone.now() - at).total_seconds())
    if age <= 90:
        return {"state": "online", "label": "Online now"}
    if age < 3600:
        return {"state": "recent", "label": "Last online within the past hour"}
    if timezone.localdate(at) == timezone.localdate():
        return {"state": "today", "label": "Last online today"}
    if age < timedelta(days=7).total_seconds():
        return {"state": "week", "label": "Last online this week"}
    return {"state": "older", "label": "Last online over a week ago"}
