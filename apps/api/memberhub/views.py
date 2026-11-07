import uuid
from datetime import date, timedelta
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.response import Response
from config.errors import DomainError
from config.views import MemberView
from accounts.models import Member
from .models import ActionRead, SavedOffer, ThreadRead
from .projections import actions, calendar, decisions


def private(data, status=200):
    response = Response(data, status=status)
    response["Cache-Control"] = "private, no-store"
    return response


class ActionsView(MemberView):
    def get(self, request):
        return private(actions(request.user.id))

    @transaction.atomic
    def post(self, request):
        keys = request.data.get("keys")
        if (
            not isinstance(keys, list)
            or len(keys) > 200
            or any(not isinstance(key, str) for key in keys)
        ):
            raise DomainError("invalid_keys", "Choose up to 200 current action keys.")
        allowed = {row["key"] for row in actions(request.user.id)["actions"]}
        for key in set(keys) & allowed:
            ActionRead.objects.get_or_create(member=request.user, key=key)
        return private({"recorded": True})


class ThreadReadView(MemberView):
    @transaction.atomic
    def post(self, request, thread_id):
        from community.messaging import thread_for

        thread = thread_for(actor_id=request.user.id, thread_id=thread_id)
        through = parse_datetime(str(request.data.get("through", "")))
        if not through or timezone.is_naive(through) or through > timezone.now():
            raise DomainError(
                "invalid_read_time", "Provide the timestamp of the latest displayed message."
            )
        # Serialize per-member read updates, including the first receipt.
        Member.objects.select_for_update().get(pk=request.user.pk)
        row, _ = ThreadRead.objects.get_or_create(
            member=request.user, thread=thread, defaults={"through": through}
        )
        if row.through < through:
            row.through = through
            row.save(update_fields=["through", "updated_at"])
        return private({"recorded": True})


class SavedOffersView(MemberView):
    def get(self, request):
        from marketplace.serializers import offer_data, available_cost_example

        rows = []
        for saved in (
            SavedOffer.objects.filter(member=request.user)
            .select_related("offer__lender")
            .order_by("-created_at")[:50]
        ):
            offer = saved.offer
            available = (
                offer.status == "published"
                and offer.expires_at > timezone.now()
                and offer.lender.is_active
                and not offer.lender.suspended
            )
            data = offer_data(offer) if available else None
            if data:
                data["disclosure"] = available_cost_example(offer)
            rows.append(
                {
                    "id": str(offer.id),
                    "saved_at": saved.created_at.isoformat(),
                    "available": available,
                    "offer": data,
                }
            )
        return private({"saved": rows, "limit": 50})


class SavedOfferView(MemberView):
    @transaction.atomic
    def put(self, request, offer_id):
        from marketplace.models import LendingOffer

        desired = request.data.get("saved")
        if type(desired) is not bool:
            raise DomainError("invalid_saved", "Choose whether to save this offer.")
        Member.objects.select_for_update().get(pk=request.user.pk)
        if not desired:
            SavedOffer.objects.filter(member=request.user, offer_id=offer_id).delete()
        else:
            offer = LendingOffer.objects.filter(
                pk=offer_id,
                status="published",
                expires_at__gt=timezone.now(),
                lender__is_active=True,
                lender__suspended=False,
            ).first()
            if not offer:
                raise DomainError(
                    "offer_unavailable", "This offer is no longer available to save.", 404
                )
            if (
                not SavedOffer.objects.filter(member=request.user, offer=offer).exists()
                and SavedOffer.objects.filter(member=request.user).count() >= 50
            ):
                raise DomainError(
                    "saved_limit", "Remove an offer before saving another. You can keep 50.", 409
                )
            SavedOffer.objects.get_or_create(member=request.user, offer=offer)
        return private({"saved": desired})


class CalendarView(MemberView):
    def get(self, request):
        return private(calendar(request.user.id, request.query_params))


class CalendarExportView(MemberView):
    def get(self, request):
        data = calendar(request.user.id, request.query_params)
        # Dates-only export deliberately excludes counterparties, amounts and credentials.
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//PixelVault//Private payment dates//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:PixelVault payment dates",
        ]
        stamp = timezone.now().strftime("%Y%m%dT%H%M%SZ")
        for row in data["events"]:
            if row["status"] == "covered":
                continue
            due = date.fromisoformat(row["due_date"])
            lines += [
                "BEGIN:VEVENT",
                f"UID:{row['id'].replace(':', '-')}@pixelvault",
                f"DTSTAMP:{stamp}",
                f"DTSTART;VALUE=DATE:{due.strftime('%Y%m%d')}",
                f"DTEND;VALUE=DATE:{(due + timedelta(days=1)).strftime('%Y%m%d')}",
                "SUMMARY:Review your PixelVault payment date",
                "DESCRIPTION:Contractual date in Asia/Manila. Open your private PixelVault loan for the current schedule and payoff.",
                "END:VEVENT",
            ]
        lines += ["END:VCALENDAR", ""]
        response = HttpResponse("\r\n".join(lines), content_type="text/calendar; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="pixelvault-payment-dates.ics"'
        response["Cache-Control"] = "private, no-store"
        return response


class DecisionsView(MemberView):
    def get(self, request):
        return private(decisions(request.user.id))
