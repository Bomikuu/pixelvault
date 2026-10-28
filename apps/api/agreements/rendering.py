from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from config.errors import DomainError
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import AgreementVersion


def render_agreement(*, agreement_id, actor_id):
    agreement = AgreementVersion.objects.select_related("lender", "borrower").get(pk=agreement_id)
    if actor_id not in {agreement.borrower_id, agreement.lender_id}:
        raise DomainError("not_found", "Document not found.", 404)
    output = BytesIO()
    # invariant locks metadata/date generation for reproducible signed snapshots.
    document = SimpleDocTemplate(
        output,
        pagesize=(210 * mm, 297 * mm),
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="PixelVault unreviewed sandbox agreement",
        author="PixelVault",
        invariant=1,
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph("PixelVault — Unreviewed sandbox agreement", styles["Title"]),
        Spacer(1, 6 * mm),
        Paragraph(
            "Authenticated demonstration acceptance. This is a synthetic loan document, not a lawyer-reviewed agreement or approved live electronic-signature process.",
            styles["BodyText"],
        ),
        Spacer(1, 5 * mm),
    ]

    def paragraph(label, value):
        story.append(Paragraph(f"<b>{escape(label)}</b> {escape(str(value))}", styles["BodyText"]))
        story.append(Spacer(1, 2 * mm))

    paragraph("Lender:", agreement.canonical.get("lender_display_name", str(agreement.lender_id)))
    paragraph(
        "Borrower:", agreement.canonical.get("borrower_display_name", str(agreement.borrower_id))
    )
    paragraph("Agreement:", agreement.id)
    paragraph(
        "Template / policy:", f"{agreement.template_version} / {agreement.terms['policy_version']}"
    )
    paragraph("SHA-256:", agreement.hash)
    disclosure = agreement.disclosure

    def money(amount):
        return f"PHP {Decimal(amount) / 100:,.2f}"

    for label, key in [
        ("Principal:", "principal"),
        ("Borrower net proceeds:", "net_proceeds"),
        ("Total scheduled repayment:", "total_repayment"),
    ]:
        paragraph(label, money(disclosure[key]))
    paragraph("Calculation basis:", disclosure["rate_basis"])
    paragraph("Annual nominal rate:", f"{disclosure['annual_rate_bps'] / 100:.2f}%")
    paragraph("Effective annual cost:", disclosure["effective_annual_percentage"] + "%")
    rows = [["Due date", "Principal", "Interest", "Charges", "Total"]]
    rows += [
        [
            line["due_date"],
            money(line["principal"]),
            money(line["interest"]),
            money(line["charges"]),
            money(line["total"]),
        ]
        for line in disclosure["schedule"]
    ]
    table = Table(rows, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF2FF")),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#1D68EF")),
            ]
        )
    )
    story += [Spacer(1, 4 * mm), table, Spacer(1, 4 * mm)]
    for payer in ("borrower", "lender"):
        for fee in disclosure[payer + "_fees"]:
            paragraph(
                f"{payer.title()} fee:", f"{fee['code']}: {money(fee['amount'])} ({fee['timing']})"
            )
    paragraph(
        "Repayment rules:",
        "Partial and early payments cover accrued simple interest then principal. No interest on interest. No early-settlement penalty. Baseline late fee is zero; three-day grace applies to overdue classification. No automatic rollover.",
    )
    paragraph(
        "Recovery and disputes:",
        "Private reminders, hardship review and lawful dispute resolution. No public debt shaming, contact-list collection, threats of arrest or automatic government referral.",
    )
    paragraph(
        "Acceptance provenance:",
        "authenticated-sandbox-acceptance; each acceptance binds the exact document hash.",
    )
    for acceptance in agreement.acceptances.order_by("accepted_at"):
        paragraph(
            "Recorded acceptance:",
            f"{acceptance.member_id} — {acceptance.accepted_at.isoformat()} — {acceptance.hash}",
        )
    document.build(story)
    return output.getvalue()
