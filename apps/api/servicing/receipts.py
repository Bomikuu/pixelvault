from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from config.errors import DomainError
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def render_receipt(*, loan, entry):
    if entry.loan_id != loan.id or entry.kind != "collection":
        raise DomainError("not_found", "Collection acknowledgment not found.", 404)
    output = BytesIO()
    document = SimpleDocTemplate(
        output, title="PixelVault test collection acknowledgment", author="PixelVault", invariant=1
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph("PixelVault test collection acknowledgment", styles["Title"]),
        Spacer(1, 6 * mm),
    ]
    fields = [
        ("Issuer", "PixelVault sandbox record"),
        ("Record reference", str(entry.id)),
        ("Loan reference", str(loan.id)),
        ("Collection source", entry.source_key),
        ("Effective payment time", entry.effective_at.isoformat()),
        ("Recorded time", entry.created_at.isoformat()),
        ("Borrower", loan.agreement.canonical.get("borrower_display_name", str(loan.borrower_id))),
        ("Lender", loan.agreement.canonical.get("lender_display_name", str(loan.lender_id))),
        ("Recorded amount", f"PHP {Decimal(entry.amount) / 100:,.2f}"),
        ("Allocated to interest", f"PHP {Decimal(-entry.interest_delta) / 100:,.2f}"),
        ("Allocated to principal", f"PHP {Decimal(-entry.principal_delta) / 100:,.2f}"),
        ("Lender settlement", "Unknown; collection is separate from settlement"),
    ]
    for label, value in fields:
        story += [
            Paragraph(f"<b>{escape(label)}:</b> {escape(value)}", styles["BodyText"]),
            Spacer(1, 3 * mm),
        ]
    story.append(
        Paragraph(
            "This acknowledges a recorded synthetic collection. It is not a BIR-certified tax receipt, evidence of a live payment, or a lender-settlement confirmation. Any subsequent reversals remain visible in the private loan timeline.",
            styles["BodyText"],
        )
    )
    document.build(story)
    return output.getvalue()


def receipt_documents(loan):
    return [
        {
            "id": str(entry.id),
            "title": "Test collection acknowledgment",
            "kind": "receipt",
            "state": "recorded_collection",
            "url": f"/api/v1/loans/{loan.id}/receipts/{entry.id}",
            "created_at": entry.created_at.isoformat(),
            "test_mode": True,
        }
        for entry in loan.ledger.filter(kind="collection").order_by("-created_at")
    ]
