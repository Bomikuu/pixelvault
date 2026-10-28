from datetime import timedelta
from uuid import uuid4

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from eligibility.models import LenderRegistration, ProductPolicy
from verification.models import VerificationCase

from accounts.models import Member


class Command(BaseCommand):
    help = "Seed fictional PixelVault members and loans in test mode only."

    def handle(self, **options):
        if settings.ENVIRONMENT != "test":
            raise CommandError("Synthetic demo fixtures cannot be seeded in live mode.")
        if Member.objects.filter(email="maya@pixelvault.test").exists():
            self.stdout.write("Demo members already exist; no data or passwords changed.")
            return
        ProductPolicy.objects.get_or_create(
            version="demo-v1",
            defaults={
                "environment": "test",
                "approved": True,
                "evidence_ref": "synthetic-fixture-not-regulatory-approval",
                "rules": {
                    "min_principal": 10000,
                    "max_principal": 10000000,
                    "max_annual_rate_bps": 2400,
                    "max_installments": 24,
                    "allowed_frequencies": ["weekly", "twice_monthly", "monthly", "maturity"],
                    "commission_bps": 200,
                },
            },
        )
        people = [
            (
                "maya",
                "Maya Reyes",
                "Quezon City",
                "Freelance designer. Here to build a thoughtful financial future.",
            ),
            (
                "elias",
                "Elias Cruz",
                "Quezon City",
                "Small business owner. Clear terms and respectful conversations.",
            ),
            (
                "lina",
                "Lina Torres",
                "Makati",
                "Supporting practical plans, one clear agreement at a time.",
            ),
            (
                "nico",
                "Nico Santos",
                "Pasig",
                "Community member and advocate for financial literacy.",
            ),
            ("bea", "Bea Navarro", "Manila", "A little planning makes room for tomorrow."),
            (
                "rafa",
                "Rafa Dizon",
                "Taguig",
                "Flexible plans with transparent, understandable terms.",
            ),
        ]
        members = {}
        for handle, name, area, bio in people:
            member = Member.objects.create_user(
                username=handle,
                email=f"{handle}@pixelvault.test",
                password="PixelVaultDemo!2026",
                display_name=name,
                area=area,
                bio=bio,
                literacy_completed=True,
            )
            members[handle] = member
            for kind in ["identity", "income", "contact", "funding_account"]:
                VerificationCase.objects.create(
                    member=member,
                    kind=kind,
                    status="approved",
                    provenance="sandbox",
                    reason="Fictional test fixture; no real identity verified",
                    expires_at=timezone.now() + timedelta(days=90),
                )
            LenderRegistration.objects.create(member=member)
        admin = Member.objects.create_user(
            username="admin",
            email="admin@pixelvault.test",
            password="PixelVaultDemo!2026",
            display_name="Demo reviewer",
            is_staff=True,
            staff_role="admin",
        )
        from agreements.acceptance import accept_agreement
        from agreements.schedule import generate_due_dates
        from agreements.types import Fee, LoanTerms
        from marketplace.applications import apply_to_offer
        from marketplace.offers import publish_offer
        from marketplace.reservations import select_application
        from servicing.allocation import record_collection
        from servicing.models import Loan
        from servicing.transfers import request_disbursement

        today = timezone.localdate()
        offers = []
        for handle, amount, title, annual in [
            ("elias", 3000000, "A little room for your next big step", 1200),
            ("lina", 1500000, "Support for the plans that matter", 1000),
            ("nico", 1000000, "Clear terms. A fresh start.", 1200),
            ("bea", 800000, "A practical plan, together", 900),
            ("rafa", 2000000, "Build your next chapter", 1100),
        ]:
            terms = LoanTerms(
                principal=amount,
                currency="PHP",
                annual_rate_bps=annual,
                frequency="monthly",
                installment_count=3,
                effective_date=today,
                due_dates=generate_due_dates(effective_date=today, frequency="monthly", count=3),
                lender_fees=(Fee("platform_commission_demo", amount * 2 // 100, "upfront"),),
            )
            offers.append(
                publish_offer(
                    lender_id=members[handle].pk,
                    terms=terms,
                    declared_amount=amount,
                    min_amount=100000,
                    operation_id=uuid4(),
                    title=title,
                    area=members[handle].area,
                )
            )

        def funded(principal):
            offer = offers[0]
            app = apply_to_offer(
                borrower_id=members["maya"].pk,
                offer_id=offer.pk,
                principal=principal,
                operation_id=uuid4(),
                purpose="Fictional freelance equipment plan",
                summary={"employment_type": "Self-employed", "income_band": "Reviewed privately"},
            )
            reservation = select_application(
                lender_id=members["elias"].pk,
                application_id=app.pk,
                expected_offer_version=offer.version,
                operation_id=uuid4(),
            )
            agreement = reservation.agreements.latest("created_at")
            for member in [members["elias"], members["maya"]]:
                result = accept_agreement(
                    member_id=member.pk,
                    agreement_id=agreement.pk,
                    expected_hash=agreement.hash,
                    operation_id=uuid4(),
                )
            loan = Loan.objects.get(pk=result.loan_id)
            request_disbursement(
                loan_id=loan.pk, actor_id=members["elias"].pk, operation_id=uuid4()
            )
            return loan

        completed = funded(200000)
        record_collection(
            loan_id=completed.pk,
            amount=200000,
            effective_at=timezone.now(),
            source_key="demo-seed:completed",
        )
        # A completed application is no longer active for duplicate-application policy.
        completed.agreement.reservation.application.status = "completed"
        completed.agreement.reservation.application.save(update_fields=["status"])
        active = funded(800000)
        record_collection(
            loan_id=active.pk,
            amount=100000,
            effective_at=timezone.now(),
            source_key="demo-seed:partial",
        )
        for offer in offers[1:3]:
            apply_to_offer(
                borrower_id=members["maya"].pk,
                offer_id=offer.pk,
                principal=300000,
                operation_id=uuid4(),
                purpose="Fictional work equipment",
                summary={"employment_type": "Freelancer"},
            )
        from community.awards import evaluate_awards
        from community.messaging import ensure_thread, send_message
        from community.models import Award, Contribution
        from community.profiles import set_public_badges

        for handle in ["elias", "lina", "nico"]:
            for n in range(5 if handle == "elias" else 3):
                Contribution.objects.create(
                    member=members[handle],
                    title=f"Planning tip {n + 1}",
                    body="Synthetic educational example: compare full cost and payment dates before agreeing.",
                    status="approved",
                    moderator=admin,
                    moderation_reason="Fictional seed content",
                )
        for member in members.values():
            evaluate_awards(member_id=member.pk, rule_version="v1")
            set_public_badges(
                member_id=member.pk,
                award_ids=list(
                    Award.objects.filter(member=member, eligible=True, private=False).values_list(
                        "pk", flat=True
                    )[:3]
                ),
            )
        thread = ensure_thread(actor_id=members["maya"].pk, loan_id=active.pk)
        send_message(
            actor_id=members["elias"].pk,
            thread_id=thread.pk,
            body="Welcome, Maya. Your agreed schedule and documents are available in the shared loan timeline. This is a synthetic demo conversation.",
            operation_id=uuid4(),
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Fictional demo seeded. No real identity checks, provider calls, messages or money movement occurred."
            )
        )
        self.stdout.write(
            "Demo logins: maya@pixelvault.test / elias@pixelvault.test / admin@pixelvault.test. Password: PixelVaultDemo!2026"
        )
