from config.schema_types import BOOL, INT, TEXT, TIME, UUID, array, nullable, obj, op, ref

SCHEMAS = {
    "SetupCompleteness": obj({"completed": INT, "total": INT, "percent": INT, "steps": array(obj({"key": TEXT, "label": TEXT, "complete": BOOL, "href": TEXT}))}),
    "Member": obj({"id": UUID, "email": {"type": "string", "format": "email"}, "display_name": TEXT, "area": TEXT, "bio": TEXT, "avatar_key": TEXT, "photo_url": nullable(TEXT), "photo_mode": TEXT, "has_photo": BOOL, "stored_photo_url": nullable(TEXT), "mobile_number": TEXT, "suspended": BOOL, "literacy_completed": BOOL, "staff_role": TEXT, "is_staff": BOOL, "community_reputation": ref("Reputation"), "setup_completeness": ref("SetupCompleteness")}, ["id", "email", "display_name", "area", "bio", "avatar_key", "photo_url", "suspended", "literacy_completed", "staff_role", "is_staff", "community_reputation"]),
    "Session": obj({"member": nullable(ref("Member")), "environment": {"type": "string", "enum": ["test", "live"]}, "csrf_token": TEXT}),
}
EMAIL = {"type": "string", "format": "email"}
PROFILE = obj({"display_name": {**TEXT, "maxLength": 100}, "area": TEXT, "bio": {**TEXT, "maxLength": 400}, "avatar_key": TEXT, "photo_mode": {"type": "string", "enum": ["avatar", "photo"]}}, [])
OPERATIONS = {
    ("SessionView", "GET"): op(ref("Session"), summary="Bootstrap the current session and CSRF token", description="Public. Member is null for guests. Keep the CSRF value in memory; send X-CSRFToken for protected writes. Session IDs remain in an HttpOnly cookie."),
    ("SignInView", "POST"): op(ref("Session"), obj({"email": EMAIL, "password": {**TEXT, "format": "password", "writeOnly": True}}), summary="Sign in and rotate the browser session"),
    ("RegisterView", "POST"): op(ref("Session"), obj({"email": EMAIL, "password": {**TEXT, "format": "password", "writeOnly": True}, "accepted_policy_version": TEXT, "display_name": TEXT, "mobile_number": TEXT}), status=201, summary="Register an individual member", description="Contact details are self-reported until their separate checks complete. This endpoint never grants staff status."),
    ("SignOutView", "POST"): op(obj({"signed_out": BOOL}), obj({}), summary="End the browser session"),
    ("PresenceView", "POST"): op(ref("Recorded"), obj({}), summary="Record coarse activity privately"),
    ("ProfileView", "PATCH"): op(ref("Member"), PROFILE, summary="Update your display identity"),
    ("ProfilePhotoView", "POST"): op(ref("Member"), {"multipart/form-data": obj({"photo": {"type": "string", "format": "binary"}})}, status=201, summary="Upload your profile photo", description="Nonanimated JPEG, PNG or WebP, at most 3 MiB; at least 128 pixels per side, at most 4096 per side and 12 million total pixels. Sanitized to a metadata-free JPEG no larger than 768 per side. This is not an identity-document upload."),
    ("ProfilePhotoView", "DELETE"): op(ref("Member"), summary="Remove your profile photo"),
    ("PublicPhotoView", "GET"): op({"type": "string", "format": "binary"}, media="image/jpeg", summary="Read an approved profile photo"),
    ("ContactView", "GET"): op(obj({"email": EMAIL, "mobile_number": TEXT, "email_verified": BOOL, "mobile_verified": BOOL, "verification": obj({"status": TEXT, "current": BOOL, "provenance": nullable(TEXT), "expires_at": nullable(TIME)}), "delivery_available": BOOL, "notice": TEXT}, ["email", "mobile_number"]), summary="Read your private contact details", partial=True),
    ("ContactView", "PATCH"): op(obj({"email": EMAIL, "mobile_number": TEXT}, ["email", "mobile_number"]), obj({"email": EMAIL, "mobile_number": TEXT}, []), summary="Update private contact details", description="Changing an email does not establish recovery ownership.", partial=True),
    ("LiteracyView", "GET"): op(obj({"completed": BOOL, "questions": array(obj({"prompt": TEXT, "options": array(TEXT)}))}), summary="Read financial literacy progress"),
    ("LiteracyView", "POST"): op(obj({"completed": BOOL}), obj({"answers": array(INT)}), summary="Complete the literacy step"),
    ("RecoveryRequestView", "POST"): op(obj({"message": TEXT, "test_mode": BOOL}), obj({"email": EMAIL}), summary="Request a private recovery email", description="Same public response for existing and unknown accounts. Delivery is asynchronous; test messages are captured locally.", partial=True),
    ("RecoveryConfirmView", "POST"): op(obj({"changed": BOOL, "message": TEXT}), obj({"token": {**TEXT,"writeOnly":True}, "password": {**TEXT, "format": "password", "writeOnly":True}, "password_confirm": {**TEXT, "format":"password", "writeOnly":True}}), summary="Consume a single-use recovery link", partial=True),
}

OPERATIONS.update({
    ("RecoveryEmailView", "GET"): op(obj({"verified": BOOL, "email": EMAIL, "delivery_available": BOOL, "delivery_mode": {"type": "string", "enum": ["local_capture", "email"]}}), summary="Read your separately verified recovery email"),
    ("RecoveryEmailView", "POST"): op(obj({"sent": BOOL, "message": TEXT}), obj({}), summary="Request an email ownership challenge", description="One-minute cooldown. Link expires in 30 minutes. Test email is captured locally, not sent externally."),
    ("VerifyRecoveryEmailView", "POST"): op(obj({"verified": BOOL}), obj({"token": {**TEXT,"writeOnly":True}}), summary="Consume a single-use email ownership challenge", description="Public with CSRF protection; link token is provided in URL fragment and submitted explicitly. Does not verify identity or loan eligibility."),
})

CONTACT = obj({"email":EMAIL,"mobile_number":TEXT,"email_verified":BOOL,"mobile_verified":BOOL,"verification":obj({"status":TEXT,"current":BOOL,"provenance":nullable(TEXT),"expires_at":nullable(TIME)}),"delivery_available":BOOL,"notice":TEXT})
OPERATIONS[("ContactView","GET")]=op(CONTACT,summary="Read your private self-reported contacts and separate evidence state")
OPERATIONS[("ContactView","PATCH")]=op(CONTACT,obj({"email":EMAIL,"mobile_number":TEXT},[]),summary="Update contacts and invalidate prior contact evidence",description="At least one field required. Does not verify channel ownership or recovery email.")
OPERATIONS[("RecoveryRequestView","POST")]["partial"]=False
OPERATIONS[("RecoveryConfirmView","POST")]["partial"]=False
OPERATIONS[("StepUpView","POST")]=op(obj({"expires_at":TIME,"provenance":TEXT}),obj({"password":{**TEXT,"format":"password","writeOnly":True}}),summary="Confirm a staff-only sensitive action window",description="Current staff password in test mode; five-minute window. Production requires configured MFA and currently refuses this operation.")
SCHEMAS["ProductRules"]=obj({"min_principal":{**INT,"minimum":1},"max_principal":INT,"max_annual_rate_bps":INT,"max_installments":{**INT,"minimum":1,"maximum":120},"allowed_frequencies":array({"type":"string","enum":["weekly","twice_monthly","monthly","maturity"]}),"commission_bps":INT})
OPERATIONS.update({
 ("AuditView","GET"):op(array(obj({"id":UUID,"action":TEXT,"subject_id":nullable(UUID),"actor_id":nullable(UUID),"reason":TEXT,"created_at":TIME})),summary="Read finance-only audit records",description="Latest 100 entries. Documentation access does not grant finance access."),
 ("PoliciesView","GET"):op(array(obj({"id":UUID,"version":TEXT,"environment":TEXT,"approved":BOOL,"evidence_ref":TEXT,"rules":ref("ProductRules")})),summary="Read immutable product policies"),
 ("PoliciesView","POST"):op(obj({"id":UUID,"version":TEXT,"environment":TEXT}),obj({"version":{**TEXT,"maxLength":60},"evidence_ref":{**TEXT,"maxLength":200},"rules":ref("ProductRules")}),status=201,summary="Create a new test policy version",description="Admin-only sensitive step-up. Test environment only. Existing versions are immutable; no live-policy activation is provided."),
 ("TemplatesView","GET"):op(obj({"templates":array(obj({"version":TEXT,"reviewed":BOOL,"environment":TEXT,"status":TEXT})),"live_activation_available":BOOL,"explanation":TEXT}),summary="Read sandbox agreement-template inventory"),
 ("RegistrationQueueView","GET"):op(array({"allOf":[ref("LenderRegistration"),obj({"member_id":UUID,"member_name":TEXT,"member":{"allOf":[ref("PublicIdentity"),obj({"id":UUID})]}})]}),summary="Read reviewer-only lender registrations",description="At most 100. Registration evidence review is not legal authorization."),
})
