import { useState } from "react";
import {
  DisclosureBlock,
  Button,
  Empty,
  ErrorState,
  Loading,
  Note,
  Status,
  date,
  money,
} from "../../components/ui";
import { useMemberQuery, useSession } from "../../app/session";
import { saveFile } from "../../app/api";
import { financialPost } from "../../app/financial";
import { ConfirmAction } from "../../components/ConfirmAction";
import type { Loan } from "@pixelvault/contracts";
import type { ApiSchemas as components } from "@pixelvault/contracts";
type Event = components["schemas"]["LedgerEvent"];
type Document = components["schemas"]["LoanDocument"];
export function LoanRecords({
  loan,
  borrowing,
}: {
  loan: Loan;
  borrowing: boolean;
}) {
  const { session } = useSession();
  const [error, setError] = useState<unknown>(null);
  const history = useMemberQuery<Event[]>(
    ["loan-history", loan.id],
    `/loans/${loan.id}/timeline`,
  );
  const documents = useMemberQuery<Document[]>(
    ["loan-documents", loan.id],
    `/loans/${loan.id}/documents`,
  );
  return (
    <>
      {error !== null && <ErrorState error={error} />}
      <DisclosureBlock title="Payment and loan history">
        {history.isPending ? (
          <Loading />
        ) : history.error ? (
          <ErrorState error={history.error} />
        ) : history.data?.length ? (
          history.data.map((event) => (
            <article
              key={event.id}
              className="border-l-2 border-border py-3 pl-4"
            >
              <div className="flex justify-between gap-3">
                <h3 className="text-sm font-semibold">
                  {event.kind.replaceAll("_", " ")}
                </h3>
                <strong className="text-sm tabular-nums">
                  {money(event.amount)}
                </strong>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Effective {date(event.effective_at)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recorded {date(event.recorded_at)}
              </p>
              {event.kind === "collection" && (
                <Button
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() =>
                    void saveFile(
                      `/loans/${loan.id}/receipts/${event.id}`,
                    ).catch(setError)
                  }
                >
                  Collection acknowledgment PDF
                </Button>
              )}
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No financial ledger events have been recorded.
          </p>
        )}
        <Note>
          Reversals remain visible. A collection acknowledgment is separate from
          lender settlement.
        </Note>
      </DisclosureBlock>
      <DisclosureBlock title="Shared loan documents">
        {documents.isPending ? (
          <Loading />
        ) : documents.error ? (
          <ErrorState error={documents.error} />
        ) : (
          documents.data?.map((document) => (
            <div key={document.id} className="border-b border-border py-3">
              <p className="text-sm font-semibold">{document.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {document.state.replaceAll("_", " ")}
              </p>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => void saveFile(document.url).catch(setError)}
              >
                Download authorized document
              </Button>
            </div>
          ))
        )}
      </DisclosureBlock>
      {!borrowing &&
        loan.test_mode &&
        loan.disbursement_status !== "confirmed" &&
        loan.status === "awaiting_disbursement" && (
          <section className="space-y-3">
            <Note>
              Test disbursement is a separate lender action. The server rechecks
              the accepted contract, eligibility and signed effective date. No
              real funds move.
            </Note>
            <ConfirmAction
              label="Request test disbursement"
              title="Simulate this loan’s disbursement?"
              description="This creates a synthetic funding record only. It does not use a live transfer provider."
              fingerprint={`${loan.id}:${loan.agreement_id}:${loan.status}`}
              reconcile={() => history.refetch()}
              onConfirm={async () => {
                await financialPost(
                  `/loans/${loan.id}/disburse`,
                  `${session?.member?.id}:disburse:${loan.id}`,
                  {},
                );
                location.reload();
              }}
            />
          </section>
        )}
    </>
  );
}
