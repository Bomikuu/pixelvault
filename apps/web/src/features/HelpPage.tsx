import { Link } from "react-router-dom";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { ActionLink, Notice, PageHeading } from "../components";
export function HelpPage() {
  return (
    <>
      <PageHeading
        title="A clear answer. A private way forward."
        description="Understand this test community and find the right support route."
      />
      <div className="help-layout">
        <article className="surface help-copy">
          <section id="test-mode">
            <h2>What test mode means</h2>
            <p>
              PixelVault currently demonstrates individual-to-individual lending
              with synthetic members and test records. No real money moves.
              Identity and liveness adapters are simulated. Live origination
              requires unresolved regulatory, lender-eligibility and provider
              approvals.
            </p>
          </section>
          <section id="terms">
            <h2>Before you agree</h2>
            <p>
              An offer is an individual’s stated intention to lend. It is not an
              approved credit line, insured deposit or money held in a
              PixelVault wallet. Review the full principal, interest method,
              fees, total repayment and exact dates. Both parties accept the
              same agreement.
            </p>
            <p>
              Test participation terms and agreement templates do not claim
              professional legal review. Production policy and template versions
              need the applicable review before activation.
            </p>
          </section>
          <section id="privacy">
            <h2>Information has boundaries</h2>
            <p>
              Public profiles contain only optional community information. ID
              files, income documents, exact home coordinates, private
              applications and financial risk history stay access-controlled.
              Document grants expire and access is audited.
            </p>
            <p>
              Do not post debt claims, ID numbers, bank details, home addresses
              or private conversations. Contact harvesting, employer exposure
              and social-media debt shaming are prohibited.
            </p>
          </section>
          <section>
            <h2>If repayment gets difficult</h2>
            <p>
              Open a private hardship case before the situation worsens.
              Describe your circumstances and the adjustment you are requesting.
              A changed schedule needs a separately accepted amendment; your
              original agreement and history remain intact.
            </p>
            <p>
              Support, permitted documents and repayment remain available when
              new borrowing is restricted. A complaint is not automatically a
              fraud finding or a government filing.
            </p>
          </section>
          <section>
            <h2>How reputation works</h2>
            <p>
              Public community levels reflect learning and approved
              contributions. Optional achievements describe specific milestones.
              They cannot be purchased, do not reward loan size and never
              guarantee repayment. Private factual financial history has a
              correction and appeal path.
            </p>
          </section>
        </article>
        <aside className="surface support-panel">
          <LifeBuoy size={27} />
          <h2>Let’s take the next step.</h2>
          <p>
            Questions, disputes and privacy requests belong in a private case.
          </p>
          <ActionLink to="/cases/new">
            Contact private support
            <ArrowRight size={16} />
          </ActionLink>
          <Link className="text-link" to="/cases">
            Your existing cases
            <ArrowRight size={15} />
          </Link>
          <Link className="text-link" to="/learn">
            Visit the learning room
            <ArrowRight size={15} />
          </Link>
          <Link className="text-link" to="/how-it-works">
            See the seven-step lending guide
            <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </>
  );
}
