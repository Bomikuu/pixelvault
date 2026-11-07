import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ApiSchemas, Loan } from "@pixelvault/contracts";
import {
  Action,
  DisclosureBlock,
  Empty,
  ErrorState,
  Form,
  Illustration,
  Loading,
  Note,
  Page,
  Panel,
  Picker,
  Status,
  TextField,
  date,
} from "../../components/ui";
import { operationId, post } from "../../app/api";
import { useMemberQuery } from "../../app/session";
type Case = ApiSchemas["schemas"]["SupportCase"];
export function SupportScreen() {
  const { caseId } = useParams(),
    navigate = useNavigate();
  const key = useRef(operationId()),
    [kind, setKind] = useState("complaint"),
    [loan, setLoan] = useState("none");
  const list = useMemberQuery<{ cases: Case[] }>(["cases"], "/cases");
  const detail = useMemberQuery<Case>(["case", caseId], `/cases/${caseId}`, {
    enabled: !!caseId,
  });
  const loans = useMemberQuery<Loan[]>(["loans"], "/loans");
  return (
    <Page
      title={
        caseId ? "Your private support record." : "A private place for help."
      }
      description="Questions, hardship, disputes and privacy concerns stay within authorized support channels."
      back
    >
      <Note>
        No debt posting, contact harvesting or automatic government filing is
        part of this service.
      </Note>
      {caseId ? (
        detail.isPending ? (
          <Loading />
        ) : detail.error ? (
          <ErrorState error={detail.error} />
        ) : (
          detail.data && (
            <>
              <Status value={detail.data.status} />
              <Panel>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {detail.data.body}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Opened {date(detail.data.created_at)}
                </p>
              </Panel>
              {detail.data.responses.map((response) => (
                <Panel key={response.id}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {response.body}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {date(response.created_at)}
                  </p>
                </Panel>
              ))}
              <Form
                submit="Send private response"
                resetOnSuccess
                onSubmit={async (form) => {
                  await post(`/cases/${caseId}/responses`, {
                    body: String(form.get("body") || ""),
                  });
                  await detail.refetch();
                }}
              >
                <TextField
                  label="Your response"
                  name="body"
                  maxLength={5000}
                  required
                />
              </Form>
            </>
          )
        )
      ) : (
        <>
          <Illustration scene="shared-plan" className="mx-auto max-w-60" />
          <DisclosureBlock title="Start a private support request" defaultOpen>
            <Form
              submit="Open support request"
              onSubmit={async (form) => {
                const result = await post<Case>("/cases", {
                  kind,
                  body: String(form.get("body") || ""),
                  ...(loan === "none" ? {} : { loan_id: loan }),
                  operation_id: key.current,
                });
                key.current = operationId();
                navigate(`/help/${result.id}`);
              }}
            >
              <Picker
                label="What can we help with?"
                value={kind}
                onChange={setKind}
                options={[
                  "complaint",
                  "hardship",
                  "dispute",
                  "privacy",
                  "appeal",
                  "disclosure",
                ].map((value) => ({
                  value,
                  label: value[0].toUpperCase() + value.slice(1),
                }))}
              />
              <Picker
                label="Related loan"
                value={loan}
                onChange={setLoan}
                options={[
                  { value: "none", label: "General account concern" },
                  ...(loans.data || []).map((row) => ({
                    value: row.id,
                    label: `${row.borrower.display_name} / ${row.lender.display_name} (${row.status})`,
                  })),
                ]}
              />
              <TextField
                label="What happened, and what help do you need?"
                name="body"
                maxLength={5000}
                required
              />
            </Form>
          </DisclosureBlock>
          {list.isPending ? (
            <Loading />
          ) : list.error ? (
            <ErrorState error={list.error} />
          ) : list.data?.cases.length ? (
            <div className="space-y-3">
              {list.data.cases.map((row) => (
                <Action
                  key={row.id}
                  to={`/help/${row.id}`}
                  variant="outline"
                  className="h-auto! w-full justify-between! p-4! text-left"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {row.kind.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {date(row.created_at)}
                    </p>
                  </div>
                  <Status value={row.status} />
                </Action>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No support requests yet.
            </p>
          )}
        </>
      )}
    </Page>
  );
}
