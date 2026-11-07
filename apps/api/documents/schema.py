from config.schema_types import INT, TEXT, TIME, UUID, array, choice, obj, op, parameter, ref

SCHEMAS = {"PrivateDocument": obj({"id": UUID, "name": TEXT, "purpose": TEXT, "status": TEXT, "size": INT, "created_at": TIME, "provenance": TEXT})}
OPERATIONS = {
    ("DocumentsView", "GET"): op(array(ref("PrivateDocument")), summary="List only your private documents"),
    ("UploadView", "POST"): op(ref("PrivateDocument"), {"multipart/form-data": obj({"file": {"type": "string", "format": "binary"}, "purpose": choice("identity", "income", "address", "funding_account", "registration", "room_evidence")})}, status=201, summary="Upload private evidence into quarantine", description="Nonempty PDF, PNG or JPEG, at most 10 MiB. The server inspects file magic. Uploading is not a verification approval."),
    ("DownloadView", "GET"): op(obj({"url": TEXT, "expires_at": TIME}), summary="Request a short-lived private document link", parameters=[parameter("purpose", choice("owner", "review"))], description="Rechecks actor, document purpose and clean scan state. Link expires in 60 seconds and remains bound to this actor; do not log or cache it."),
    ("ContentView", "GET"): op({"type": "string", "format": "binary"}, summary="Download an authorized clean document", parameters=[parameter("token", TEXT, "Actor-bound short-lived signed grant.", True)], media=["application/pdf","image/png","image/jpeg"], description="Actual Content-Type is application/pdf, image/png or image/jpeg from the stored magic-checked file. Content-Disposition uses filename*=UTF-8; Cache-Control private,no-store. Signed token alone does not grant access."),
    ("ScanView", "POST"): op(ref("PrivateDocument"), obj({}), summary="Review a quarantined file with the sandbox scanner", description="Reviewer/admin with recent step-up. Test-only scanner; production returns scanner unavailable. A clean scan is not proof of authenticity."),
}
