from community.permissions import staff_for
from community.views import validated
from config.errors import DomainError
from config.views import MemberView
from rest_framework import serializers
from rest_framework.response import Response

from .amendments import accept_amendment, propose_amendment, withdraw_amendment
from .models import AmendmentProposal, Case, Notice, NoticePreference
from .services import (
    assign_case,
    case_for,
    decide_case,
    open_case,
    respond_case,
    review_legal_remedy,
    scoped_cases,
)


def case_data(case):
    return {
        "id": str(case.id),
        "kind": case.kind,
        "status": case.status,
        "loan_id": str(case.loan_id) if case.loan_id else None,
        "body": case.body,
        "version": case.version,
        "created_at": case.created_at.isoformat(),
        "assigned": bool(case.assigned_to_id),
        "legal_remedy_reviewed": case.legal_remedy_reviewed,
        "legal_remedy_notice": "Human eligibility review only; no government filing has been made.",
        "decisions": [
            {
                "id": str(row.id),
                "decision": row.decision,
                "reason": row.reason,
                "created_at": row.created_at.isoformat(),
            }
            for row in case.decisions.order_by("created_at")
        ],
        "responses": [
            {
                "id": str(row.id),
                "author_id": str(row.author_id),
                "body": row.body,
                "created_at": row.created_at.isoformat(),
            }
            for row in case.responses.order_by("created_at")
        ],
    }


def amendment_data(proposal):
    return {
        "id": str(proposal.id),
        "loan_id": str(proposal.loan_id),
        "terms": proposal.terms,
        "disclosures": proposal.disclosures,
        "original_agreement_hash": proposal.original_agreement_hash,
        "proposal_hash": proposal.proposal_hash,
        "reason": proposal.reason,
        "status": proposal.status,
        "version": proposal.version,
        "acceptance_count": proposal.acceptances.count(),
        "signing_mode": "authenticated-sandbox-acceptance",
    }


class CasesView(MemberView):
    def get(self, request):
        rows = (
            scoped_cases(request.user)
            .order_by("-created_at")
            .prefetch_related("decisions", "responses")[:100]
        )
        return Response({"cases": [case_data(row) for row in rows]})

    def post(self, request):
        class CaseInput(serializers.Serializer):
            loan_id = serializers.UUIDField(required=False, allow_null=True)
            kind = serializers.ChoiceField(
                choices=["hardship", "complaint", "dispute", "privacy", "appeal", "disclosure"]
            )
            body = serializers.CharField(max_length=5000)
            operation_id = serializers.UUIDField()

        case = open_case(actor_id=request.user.id, **validated(CaseInput, request.data))
        return Response(case_data(case), status=201)


class CaseDetailView(MemberView):
    def get(self, request, case_id):
        return Response(case_data(case_for(actor_id=request.user.id, case_id=case_id)))


class CaseResponseView(MemberView):
    def post(self, request, case_id):
        respond_case(actor_id=request.user.id, case_id=case_id, body=request.data.get("body", ""))
        return Response(case_data(case_for(actor_id=request.user.id, case_id=case_id)))


class CaseQueueView(MemberView):
    def get(self, request):
        staff_for(request.user.id, ("support",))
        # Unassigned queue deliberately omits private body, identity and loan IDs until staff self-assigns.
        unassigned = (
            Case.objects.filter(assigned_to__isnull=True)
            .exclude(opened_by=request.user)
            .order_by("created_at")[:100]
        )
        own = Case.objects.filter(assigned_to=request.user).order_by("-created_at")[:100]
        return Response(
            {
                "unassigned": [
                    {
                        "id": str(row.id),
                        "kind": row.kind,
                        "status": row.status,
                        "version": row.version,
                        "created_at": row.created_at.isoformat(),
                    }
                    for row in unassigned
                ],
                "assigned": [case_data(row) for row in own],
            }
        )


class AssignCaseView(MemberView):
    def post(self, request, case_id):
        return Response(case_data(assign_case(actor_id=request.user.id, case_id=case_id)))


class CaseDecisionView(MemberView):
    def post(self, request, case_id):
        class DecisionInput(serializers.Serializer):
            expected_version = serializers.IntegerField(min_value=1)
            decision = serializers.ChoiceField(
                choices=["needs_information", "resolved", "dismissed", "substantiated"]
            )
            reason = serializers.CharField(max_length=5000)

        return Response(
            case_data(
                decide_case(
                    actor_id=request.user.id,
                    case_id=case_id,
                    **validated(DecisionInput, request.data),
                )
            )
        )


class LegalRemedyView(MemberView):
    def post(self, request, case_id):
        class RemedyInput(serializers.Serializer):
            expected_version = serializers.IntegerField(min_value=1)
            reason = serializers.CharField(max_length=5000)

        return Response(
            case_data(
                review_legal_remedy(
                    actor_id=request.user.id,
                    case_id=case_id,
                    **validated(RemedyInput, request.data),
                )
            )
        )


class AmendmentsView(MemberView):
    def get(self, request):
        from django.db.models import Q
        from servicing.models import Loan

        loans = Loan.objects.filter(Q(lender=request.user) | Q(borrower=request.user)).values_list(
            "id", flat=True
        )
        return Response(
            {
                "amendments": [
                    amendment_data(proposal)
                    for proposal in AmendmentProposal.objects.filter(loan_id__in=loans).order_by(
                        "-created_at"
                    )
                ]
            }
        )

    def post(self, request):
        class ProposalInput(serializers.Serializer):
            loan_id = serializers.UUIDField()
            case_id = serializers.UUIDField(required=False)
            terms = serializers.DictField()
            reason = serializers.CharField(max_length=4000)

        proposal = propose_amendment(
            actor_id=request.user.id, **validated(ProposalInput, request.data)
        )
        return Response(amendment_data(proposal), status=201)


class AmendmentAcceptanceView(MemberView):
    def post(self, request, proposal_id):
        proposal = accept_amendment(
            actor_id=request.user.id,
            proposal_id=proposal_id,
            proposal_hash=request.data.get("proposal_hash", ""),
        )
        return Response(amendment_data(proposal))


class NoticesView(MemberView):
    def get(self, request):
        preference, _ = NoticePreference.objects.get_or_create(member=request.user)
        return Response(
            {
                "preferences": {
                    "channel": preference.channel,
                    "debt_reminders": preference.debt_reminders,
                },
                "notices": [
                    {
                        "id": str(notice.id),
                        "loan_id": str(notice.loan_id),
                        "body": notice.body,
                        "status": notice.status,
                        "channel": notice.channel,
                        "local_date": notice.local_date.isoformat(),
                    }
                    for notice in Notice.objects.filter(member=request.user).order_by(
                        "-created_at"
                    )[:100]
                ],
                "delivery_adapter": "local_capture",
                "quiet_hours": "20:00–08:00 Asia/Manila",
            }
        )

    def patch(self, request):
        class PreferenceInput(serializers.Serializer):
            channel = serializers.ChoiceField(choices=["in_app", "email", "sms"], required=False)
            debt_reminders = serializers.BooleanField(required=False)

        data = validated(PreferenceInput, request.data)
        preference, _ = NoticePreference.objects.get_or_create(member=request.user)
        for key, value in data.items():
            setattr(preference, key, value)
        preference.save()
        return self.get(request)


class AmendmentWithdrawalView(MemberView):
    def post(self, request, proposal_id):
        return Response(
            amendment_data(withdraw_amendment(actor_id=request.user.id, proposal_id=proposal_id))
        )


class AdminCaseDetailView(MemberView):
    def get(self, request, case_id):
        staff_for(request.user.id, ("support",))
        try:
            case = Case.objects.get(pk=case_id)
        except Case.DoesNotExist:
            raise DomainError("not_found", "Record not found.", 404)
        if case.assigned_to_id == request.user.id:
            return Response(case_data(case))
        if case.assigned_to_id or case.opened_by_id == request.user.id:
            raise DomainError("not_found", "Record not found.", 404)
        return Response(
            {
                "id": str(case.id),
                "kind": case.kind,
                "status": case.status,
                "version": case.version,
                "created_at": case.created_at.isoformat(),
                "assigned": False,
                "access": "assignment_required",
            }
        )
