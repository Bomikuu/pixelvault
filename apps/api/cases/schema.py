from config.schema_types import BOOL, CENTS, DATE, INT, TEXT, TIME, UUID, array, choice, nullable, obj, op, ref

SCHEMAS = {
    "SupportCase": obj({"id":UUID,"kind":TEXT,"status":TEXT,"loan_id":nullable(UUID),"body":TEXT,"version":INT,"created_at":TIME,"assigned":BOOL,"legal_remedy_reviewed":BOOL,"legal_remedy_notice":TEXT,"decisions":array(obj({"id":UUID,"decision":TEXT,"reason":TEXT,"created_at":TIME})),"responses":array(obj({"id":UUID,"author_id":UUID,"body":TEXT,"created_at":TIME}))}),
    "CaseQueueItem":obj({"id":UUID,"kind":TEXT,"status":TEXT,"version":INT,"created_at":TIME}),
    "Amendment":obj({"id":UUID,"loan_id":UUID,"terms":ref("Terms"),"disclosures":{"allOf":[ref("Disclosure"),obj({"preserved_accrued_interest":CENTS,"total_remaining_obligation":CENTS,"preserved_interest_due":TEXT})]},"original_agreement_hash":TEXT,"proposal_hash":TEXT,"reason":TEXT,"status":TEXT,"version":INT,"acceptance_count":INT,"signing_mode":TEXT}),
    "NoticePreferences":obj({"preferences":obj({"channel":choice("in_app","email","sms"),"debt_reminders":BOOL}),"notices":array(obj({"id":UUID,"loan_id":UUID,"body":TEXT,"status":TEXT,"channel":TEXT,"local_date":DATE})),"delivery_adapter":TEXT,"quiet_hours":TEXT}),
}
OPERATIONS = {
    ("CasesView","GET"):op(obj({"cases":array(ref("SupportCase"))}),summary="Read your private support cases",description="Participant/assigned-staff scope; maximum 100. No public debt publication."),
    ("CasesView","POST"):op(ref("SupportCase"),obj({"loan_id":nullable(UUID),"kind":choice("hardship","complaint","dispute","privacy","appeal","disclosure"),"body":{**TEXT,"maxLength":5000},"operation_id":UUID},["kind","body","operation_id"]),status=201,summary="Open a private support case"),
    ("CaseDetailView","GET"):op(ref("SupportCase"),summary="Read an authorized support case"),
    ("CaseResponseView","POST"):op(ref("SupportCase"),obj({"body":TEXT}),summary="Respond privately to a case"),
    ("CaseQueueView","GET"):op(obj({"unassigned":array(ref("CaseQueueItem")),"assigned":array(ref("SupportCase"))}),summary="Read support assignment queues",description="Support/admin. Unassigned items omit body, identity and loan IDs; maximum 100 in each list."),
    ("AssignCaseView","POST"):op(ref("SupportCase"),obj({}),summary="Assign a support case to yourself"),
    ("AdminCaseDetailView","GET"):op({"oneOf":[ref("SupportCase"),{"allOf":[ref("CaseQueueItem"),obj({"assigned":BOOL,"access":choice("assignment_required")})]}]},summary="Read assigned case or redacted assignment preview"),
    ("CaseDecisionView","POST"):op(ref("SupportCase"),obj({"expected_version":{**INT,"minimum":1},"decision":choice("needs_information","resolved","dismissed","substantiated"),"reason":{**TEXT,"maxLength":5000}}),summary="Record an assigned support decision"),
    ("LegalRemedyView","POST"):op(ref("SupportCase"),obj({"expected_version":{**INT,"minimum":1},"reason":{**TEXT,"maxLength":5000}}),summary="Record a human legal-remedy eligibility review",description="No barangay/government filing, social post or automatic enforcement is made."),
    ("AmendmentsView","GET"):op(obj({"amendments":array(ref("Amendment"))}),summary="List amendments for your shared loans"),
    ("AmendmentsView","POST"):op(ref("Amendment"),obj({"loan_id":UUID,"case_id":UUID,"terms":ref("Terms"),"reason":{**TEXT,"maxLength":4000}},["loan_id","terms","reason"]),status=201,summary="Propose a versioned loan amendment",description="The server preserves accrued obligations, recalculates disclosures and requires both parties' acceptance. This is not an edit of a signed row."),
    ("AmendmentAcceptanceView","POST"):op(ref("Amendment"),obj({"proposal_hash":TEXT}),summary="Accept the exact amendment version"),
    ("AmendmentWithdrawalView","POST"):op(ref("Amendment"),obj({}),summary="Withdraw a pending amendment"),
    ("NoticesView","GET"):op(ref("NoticePreferences"),summary="Read private notices and reminder preferences"),
    ("NoticesView","PATCH"):op(ref("NoticePreferences"),obj({"channel":choice("in_app","email","sms"),"debt_reminders":BOOL},[]),summary="Update private notice preferences",description="Current delivery adapter is local capture; choosing email/SMS does not configure external delivery. Quiet hours apply."),
}
