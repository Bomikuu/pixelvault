from config.views import MemberView
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import CoBorrowerInvitation
from .services import actor_for, claim_for, create_invitation, decide_invitation, invitation_data


class InvitationsView(MemberView):
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "co_borrower_invite"

    def get_throttles(self):
        return [] if self.request.method == "GET" else super().get_throttles()

    def get(self, request):
        actor = actor_for(request.user.id)
        rows = (
            CoBorrowerInvitation.objects.filter(
                Q(inviter=actor)
                | Q(invitee=actor)
                | Q(email__iexact=actor.email, invitee__isnull=True, status="pending")
            )
            .select_related("inviter", "invitee")
            .order_by("-created_at", "-id")[:100]
        )
        return Response({"invitations": [invitation_data(row, actor=actor) for row in rows]})

    def post(self, request):
        invitation = create_invitation(actor_id=request.user.id, data=request.data)
        return Response(invitation_data(invitation, actor=request.user), status=201)


class InvitationClaimView(MemberView):
    def get(self, request, token):
        actor, invitation = claim_for(actor_id=request.user.id, token=token)
        return Response(invitation_data(invitation, actor=actor))


class InvitationActionView(MemberView):
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "co_borrower_invite"

    def post(self, request, invitation_id):
        invitation = decide_invitation(
            actor_id=request.user.id, invitation_id=invitation_id, data=request.data
        )
        return Response(invitation_data(invitation, actor=request.user))
