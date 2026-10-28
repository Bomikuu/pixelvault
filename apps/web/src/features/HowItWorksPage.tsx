import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Compass,
  ReceiptText,
  FileCheck2,
  Handshake,
  Landmark,
  CalendarCheck,
} from "lucide-react";
import {
  ActionLink,
  ContextIllustration,
  IllustratedInfoDialog,
  Notice,
} from "../components";

const journey = [
  {
    title: "Verify privately.",
    summary:
      "Check identity and the evidence your activity requires. Documents stay private.",
    icon: ShieldCheck,
    description:
      "Submit identity, contact, income and funding-account evidence for the checks your activity requires. Sensitive documents stay private. Identity verification is separate from legal lending authorization.",
    detail: "Private checks, specific permissions",
  },
  {
    title: "Compare individual offers.",
    summary:
      "Meet individual lenders. Compare the amount, interest and payment frequency.",
    icon: Compass,
    description:
      "Explore offers from individual lenders in approximate areas. Compare the amount, interest, payment frequency and example total cost. An offer expresses an intention to lend; funding is not guaranteed.",
    detail: "One individual lender, one borrower",
  },
  {
    title: "Understand the full plan.",
    summary:
      "See principal, interest, fees, total repayment and every due date.",
    icon: ReceiptText,
    description:
      "Review the principal, interest method, fees, total repayment and every due date before applying. Choose a schedule you can realistically manage.",
    detail: "Costs and dates before commitment",
  },
  {
    title: "Apply. The lender chooses.",
    summary: "Send a private application. The lender decides whom to lend to.",
    icon: FileCheck2,
    description:
      "Send a private application for an offer. The lender reviews permitted information and selects an applicant. Community achievements describe milestones; they never guarantee repayment or approval.",
    detail: "A private application and a considered choice",
  },
  {
    title: "Accept the same agreement.",
    summary: "Both people accept the identical version of the disclosed terms.",
    icon: Handshake,
    description:
      "Both people review and accept the identical version of the disclosed terms. Each keeps access to the agreement and schedule. Changed terms require a new accepted version.",
    detail: "Two acceptances, one shared record",
  },
  {
    title: "Wait for confirmed funding.",
    summary:
      "Funding needs its own confirmation. Acceptance alone does not move money.",
    icon: Landmark,
    description:
      "Acceptance alone does not mean money was sent. Funding needs its own confirmation before the loan becomes active. This test environment uses explicitly simulated funding and moves no real funds.",
    detail: "An agreement is separate from a transfer",
  },
  {
    title: "Repay privately. Keep your record.",
    summary:
      "Follow the schedule, track confirmed payments and get private support when you need it.",
    icon: CalendarCheck,
    description:
      "Follow your schedule, track confirmed payments and retain private documents. If circumstances change, open a private support or hardship case. A revised plan needs mutual acceptance; debt shaming is prohibited.",
    detail: "A clear timeline and a private way forward",
  },
];

export function HowItWorksPage() {
  return (
    <article className="journey-page">
      <header className="journey-intro">
        <div>
          <h1>How PixelVault works.</h1>
          <p>
            Individual lending, one step at a time. Understand who decides, what
            you agree to and which records stay private.
          </p>
          <ActionLink to="/explore">
            Explore the community <ArrowRight size={16} />
          </ActionLink>
        </div>
        <ContextIllustration scene="lending-journey" eager />
      </header>
      <Notice>
        You’re exploring a test community intended for fictional members and
        synthetic financial records. Use fictional details only. No real funds
        move, and live lending remains disabled.
      </Notice>
      <section className="journey-sequence" aria-labelledby="journey-heading">
        <h2 id="journey-heading">Seven steps. No hidden chapter.</h2>
        <ol className="journey-steps" role="list">
          {journey.map((step, index) => (
            <li key={step.title}>
              <span className="journey-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <step.icon
                  className="journey-stage-icon"
                  size={23}
                  aria-hidden="true"
                />
                <h3>{step.title}</h3>
                <p>{step.summary}</p>
                <IllustratedInfoDialog
                  title={step.title}
                  description={step.description}
                  scene="lending-journey"
                  triggerLabel={`About step ${index + 1}`}
                >
                  <p>{step.detail}</p>
                </IllustratedInfoDialog>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <div className="journey-footnotes">
        <section>
          <BookOpen size={23} aria-hidden="true" />
          <h2>Keep the costs in view.</h2>
          <p>
            Under the current test policy, confirmed funding creates a one-time
            platform commission owed by the lender. Fee payment is recorded
            separately. PixelVault takes no platform commission on repayments.
            The borrower’s agreed interest and any disclosed charges still
            apply. Test pricing is not a live price commitment.
          </p>
          <p>
            A successful payment collection is recorded separately from
            settlement to the lender. An unknown settlement remains unknown.
          </p>
        </section>
        <section>
          <ShieldCheck size={23} aria-hidden="true" />
          <h2>Your information has boundaries.</h2>
          <p>
            Public profiles and optional awards belong to the community.
            Identity evidence, income documents, exact locations and financial
            cases belong in access-controlled records. An achievement does not
            establish legal lending authority.
          </p>
          <Link className="text-link" to="/help#privacy">
            Read the privacy boundaries <ArrowRight size={15} />
          </Link>
          <Link className="text-link" to="/learn">
            Visit the learning room <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </article>
  );
}
