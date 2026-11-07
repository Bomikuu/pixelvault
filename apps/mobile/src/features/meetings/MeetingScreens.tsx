import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft,
  Bell,
  Check,
  FileText,
  HandCoins,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@pixelvault/ui";
import type { Meeting, MeetingSummary } from "@pixelvault/contracts";
import {
  Action,
  DisclosureBlock,
  Empty,
  ErrorState,
  Field,
  Form,
  Heading,
  Illustration,
  Loading,
  Note,
  Page,
  Panel,
  PersonLine,
  Picker,
  Status,
  TextField,
  dateTime,
  money,
} from "../../components/ui";
import { ConfirmAction } from "../../components/ConfirmAction";
import { api, saveFile } from "../../app/api";
import { useMemberQuery, useSession } from "../../app/session";
import { pesoInput, toCentavos } from "../offers/OfferScreen";
import { useMeeting } from "./useMeeting";
import { DevicePreview } from "./DevicePreview";
import { RoomCall } from "./RoomCall";
export function percentBps(value: string) {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(value.trim()))
    throw new Error(
      "Enter a percentage from 0 to 100, with up to two decimals.",
    );
  const [whole, fraction = ""] = value.trim().split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (result > 10000) throw new Error("The share cannot exceed 100%.");
  return result;
}
export function MeetingsScreen() {
  const { session } = useSession();
  const query = useMemberQuery<{ rooms: MeetingSummary[] }>(
    ["meetings"],
    "/meetings",
    { interval: 15000 },
  );
  return (
    <Page
      title="Make room for a shared plan."
      description="Meet privately, review the same facts and confirm each step together."
      back
    >
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : query.data?.rooms.length ? (
        <div className="space-y-3">
          {query.data.rooms.map((room) => (
            <Action
              key={room.id}
              variant="outline"
              to={`/meetings/${room.id}`}
              className="h-auto! w-full flex-col! items-stretch! gap-4 p-4! text-left whitespace-normal! font-normal"
            >
              <div className="flex items-center justify-between gap-3">
                <Status value={room.kind} />
                <span className="text-xs text-muted-foreground">
                  {room.state.replaceAll("_", " ")}
                </span>
              </div>
              <PersonLine
                person={
                  room.lender.id === session?.member?.id
                    ? room.participant
                    : room.lender
                }
                subtitle={room.offer.title}
              />
              <div className="flex justify-between text-xs">
                <span>
                  {room.scheduled_at
                    ? dateTime(room.scheduled_at)
                    : "Choose a meeting time"}
                </span>
                <strong className="tabular-nums">{money(room.amount)}</strong>
              </div>
            </Action>
          ))}
        </div>
      ) : (
        <Empty
          title="Your next conversation has a place."
          scene="shared-plan"
          action={<Action to="/explore">Find an offer</Action>}
        >
          Start from an application or an investor pitch to create a private
          meeting.
        </Empty>
      )}
    </Page>
  );
}
export function MeetingLobby() {
  const { meetingId = "" } = useParams(),
    { session } = useSession(),
    navigate = useNavigate();
  const room = useMeeting(meetingId, "lobby");
  if (room.isPending) return <Loading />;
  if (room.error || !room.data)
    return (
      <Page title="Meeting unavailable" back>
        <ErrorState error={room.error} retry={() => room.refetch()} />
      </Page>
    );
  const data = room.data,
    lender = data.lender.id === session?.member?.id;
  const within =
    data.scheduled_at &&
    Math.abs(Date.parse(data.scheduled_at) - Date.parse(data.server_time)) <=
      3600000;
  const accepted = data.participants.every((p) => p.schedule_accepted),
    canEnter = !!within && accepted && data.state !== "closed";
  return (
    <Page title="A moment to get ready." description={data.offer.title} back>
      <Illustration scene="shared-plan" className="mx-auto max-w-72" />
      <div className="flex items-center justify-between">
        <Status value={data.kind} />
        <span className="text-xs text-muted-foreground">{room.connection}</span>
      </div>
      <Panel>
        <Heading>Your meeting time</Heading>
        <p className="text-xl font-bold">
          {data.scheduled_at
            ? dateTime(data.scheduled_at)
            : "No time selected yet"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Times are displayed in Asia/Manila (UTC+8). Entry opens one hour
          before and closes one hour after the scheduled time.
        </p>
        {lender && (
          <div className="mt-5">
            <Form
              submit="Propose meeting time"
              disabled={room.busy}
              onSubmit={async (form) => {
                const value = String(form.get("scheduled_at") || "");
                await room.act({
                  action: "schedule",
                  scheduled_at: new Date(`${value}:00+08:00`).toISOString(),
                });
              }}
            >
              <Field
                type="datetime-local"
                label="Proposed time in Manila"
                name="scheduled_at"
                required
              />
            </Form>
          </div>
        )}
        {data.scheduled_at && !room.self?.schedule_accepted && (
          <div className="mt-4">
            <ConfirmAction
              label="Accept this meeting time"
              title="Does this time work for you?"
              description={dateTime(data.scheduled_at)}
              fingerprint={`${data.schedule_version}`}
              onConfirm={() => room.act({ action: "accept_schedule" })}
              reconcile={() => room.refetch()}
            />
          </div>
        )}
      </Panel>
      <div className="space-y-3">
        {data.participants.map((person) => (
          <div key={person.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <PersonLine
                person={person}
                subtitle={
                  person.here
                    ? "In the room"
                    : person.in_lobby
                      ? "In the waiting room"
                      : person.last_seen_label || "Not here yet"
                }
              />
            </div>
            <Status
              value={
                person.schedule_accepted ? "Time accepted" : "Time pending"
              }
            />
          </div>
        ))}
      </div>
      {room.actionError !== null && <ErrorState error={room.actionError} />}
      <Button
        variant="outline"
        className="min-h-12 w-full"
        disabled={
          room.busy ||
          data.state === "closed" ||
          (!!data.pings?.next_allowed_at &&
            Date.parse(data.pings.next_allowed_at) >
              Date.parse(data.server_time))
        }
        onClick={() => void room.act({ action: "ping" }).catch(() => {})}
      >
        <Bell />
        Ping your counterparty
      </Button>
      <p className="text-xs text-muted-foreground">
        A private in-app reminder, available once per minute.
      </p>
      {Capacitor.isNativePlatform() ? (
        <Note>
          Native device preview is pending permission validation. You can
          continue with text chat.
        </Note>
      ) : (
        <DevicePreview person={session!.member!} />
      )}
      <ol className="space-y-4 border-y border-border py-5">
        {[
          [
            Users,
            "Both arrive",
            "Accept the time, then check in. Attendance is separate from signing.",
          ],
          [
            HandCoins,
            "Review together",
            "Discuss the amount, interest-sharing basis and supporting evidence.",
          ],
          [
            FileText,
            "Confirm the same version",
            "Each person reviews the exact contract; funding is a later confirmation.",
          ],
        ].map(([Icon, title, description]) => {
          const ItemIcon = Icon as typeof Users;
          return (
            <li key={String(title)} className="flex gap-3">
              <ItemIcon className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-bold">{String(title)}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {String(description)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <Form
        submit="Enter the room"
        disabled={!canEnter || room.busy}
        onSubmit={async () => {
          await room.act({ action: "check_in" });
          navigate(`/meetings/${meetingId}/room`);
        }}
      >
        <Note>
          {canEnter
            ? "Your schedule is accepted. Check in to enter; the local preview will stop."
            : data.state === "closed"
              ? "This room is closed. You can still read its record."
              : !accepted
                ? "Both people need to accept the current time."
                : "The scheduled attendance window is not open."}
        </Note>
      </Form>
      <Action
        to={`/meetings/${meetingId}/room?mode=record`}
        variant="outline"
        className="w-full"
      >
        View the meeting record
      </Action>
    </Page>
  );
}
export function MeetingRoom() {
  const { meetingId = "" } = useParams(),
    [params] = useSearchParams(),
    { session } = useSession();
  const record = params.get("mode") === "record";
  const room = useMeeting(meetingId, record ? "record" : "room");
  const [tray, setTray] = useState(false),
    [tab, setTab] = useState("plan");
  if (room.isPending) return <Loading />;
  if (room.error || !room.data)
    return (
      <Page title="Room unavailable" back>
        <ErrorState error={room.error} retry={() => room.refetch()} />
      </Page>
    );
  const data = room.data,
    readOnly =
      record ||
      data.state === "closed" ||
      !room.self?.checked_in ||
      !data.scheduled_at ||
      Math.abs(Date.parse(data.scheduled_at) - Date.parse(data.server_time)) >
        3600000,
    lender = data.lender.id === session?.member?.id;
  const steps = (
    <MeetingSteps
      room={data}
      act={room.act}
      refresh={() => room.refetch()}
      disabled={readOnly || room.busy}
      lender={lender}
      memberId={session!.member!.id}
    />
  );
  return (
    <main className="flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)]">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card p-3">
        <Action to={`/meetings/${meetingId}`} variant="ghost">
          <ArrowLeft />
          <span className="sr-only">Return to waiting room</span>
        </Action>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold">{data.offer.title}</h1>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {readOnly ? "Meeting record" : room.connection} · Test mode
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11 lg:hidden"
          onClick={() => setTray(true)}
        >
          <Settings2 />
          Steps
        </Button>
        {!readOnly && (
          <Button
            variant="ghost"
            onClick={() => void room.act({ action: "leave" }).catch(() => {})}
          >
            Leave
          </Button>
        )}
      </header>
      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border bg-card px-4 py-3">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {data.participants.map((person) => (
                <span
                  key={person.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className={`size-2 rounded-full ${person.here ? "bg-success" : "bg-muted-foreground"}`}
                  />
                  {person.display_name}
                  <span className="text-muted-foreground">
                    {person.here ? "here" : "away"}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="space-y-4 px-4 py-5">
              {readOnly && (
                <Note>
                  This is a read-only record. Return to the waiting room and
                  check in during the accepted time to make changes.
                </Note>
              )}
              {room.actionError !== null && (
                <ErrorState error={room.actionError} />
              )}
              <div className="flex gap-2">
                {[
                  ["plan", "Conversation"],
                  ["call", "Audio & camera"],
                ].map(([value, name]) => (
                  <Button
                    key={value}
                    variant={tab === value ? "secondary" : "outline"}
                    aria-pressed={tab === value}
                    className="flex-1"
                    onClick={() => setTab(value)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
              {tab === "call" ? (
                readOnly ? (
                  <Note>
                    Calls are available only while checked into a live meeting.
                  </Note>
                ) : Capacitor.isNativePlatform() ? (
                  <Note>
                    Native calls are pending device permission and network
                    validation. Use text chat here, or open the web meeting for
                    browser calls.
                  </Note>
                ) : (
                  <RoomCall room={data} />
                )
              ) : (
                <>
                  {data.messages.length === 0 && (
                    <Empty
                      title="Start with a shared understanding."
                      scene="shared-plan"
                    >
                      Review the plan in Steps, then ask questions here.
                    </Empty>
                  )}
                  {data.earlier_messages_available && (
                    <Action
                      to={`/inbox/${data.thread_id}`}
                      variant="outline"
                      className="w-full"
                    >
                      Read earlier messages
                    </Action>
                  )}
                  {data.messages.map((message) => (
                    <article
                      key={message.id}
                      className={`max-w-[92%] rounded-2xl p-4 ${message.sender.id === session?.member?.id ? "ml-auto bg-primary text-primary-foreground" : "border border-border bg-card"}`}
                    >
                      <p className="text-xs font-bold">
                        {message.sender.display_name}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.body}
                      </p>
                      <time className="mt-2 block text-[10px] opacity-75">
                        {dateTime(message.created_at)}
                      </time>
                    </article>
                  ))}
                </>
              )}
            </div>
          </div>
          {!readOnly && tab === "plan" && (
            <footer className="shrink-0 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Form
                submit="Send message"
                resetOnSuccess
                disabled={room.busy}
                onSubmit={async (form) => {
                  await room.act({
                    action: "message",
                    body: String(form.get("body") || ""),
                  });
                }}
              >
                <TextField
                  label="Private meeting message"
                  name="body"
                  maxLength={4000}
                  required
                  placeholder="Ask a question or suggest a change…"
                />
              </Form>
            </footer>
          )}
        </section>
        <aside
          aria-label="Agreement steps"
          className="hidden w-96 shrink-0 overflow-y-auto border-l border-border bg-card p-6 lg:block"
        >
          {steps}
        </aside>
      </div>
      <Dialog open={tray} onOpenChange={setTray}>
        <DialogContent className="min-w-0 max-h-[90dvh] overflow-y-auto overflow-x-hidden">
          <DialogTitle>Your shared plan</DialogTitle>
          <DialogDescription>
            Every confirmation uses the current server version.
          </DialogDescription>
          {steps}
        </DialogContent>
      </Dialog>
    </main>
  );
}
type StepsProps = {
  room: Meeting;
  act: (data: Record<string, unknown>) => Promise<Meeting>;
  refresh: () => Promise<unknown>;
  disabled: boolean;
  lender: boolean;
  memberId: string;
};
function MeetingSteps({
  room,
  act,
  refresh,
  disabled,
  lender,
  memberId,
}: StepsProps) {
  const [error, setError] = useState<unknown>(null);
  const [projection, setProjection] = useState("");
  const [returnUnused, setReturnUnused] = useState(false);
  const agreement = room.investment || room.agreement;
  const meApproved = room.approved_by.includes(memberId),
    meReviewed = room.evidence_reviewed_by.includes(memberId);
  const accepted = room.investment
    ? room.investment.approvals.some(
        (p) => p.member_id === memberId && p.kind === "contract",
      )
    : room.agreement?.acceptances.some((p) => p.member_id === memberId);
  const confirm = (
    label: string,
    title: string,
    description: string,
    command: Record<string, unknown>,
    off = false,
  ) => (
    <ConfirmAction
      label={label}
      title={title}
      description={description}
      fingerprint={`${room.id}:${room.revision}:${room.proposal_hash}:${room.evidence_hash}:${agreement?.hash || ""}:${JSON.stringify(command)}`}
      disabled={disabled || off}
      reconcile={refresh}
      onConfirm={() => act(command)}
    />
  );
  return (
    <div className="space-y-5">
      {error !== null && <ErrorState error={error} />}
      <p className="text-sm font-semibold text-primary">
        {room.kind === "investment" ? "Investor + lender" : "Borrower + lender"}
      </p>
      <Note>{room.eligibility.note}</Note>
      <Picker
        label="Meeting agenda"
        disabled={!lender || disabled}
        value={room.agenda}
        onChange={(value) => {
          if (lender && !disabled)
            void act({ action: "agenda", agenda: value }).catch(setError);
        }}
        options={[
          { value: "funding", label: "Amount & funding plan" },
          { value: "earnings", label: "Interest & repayment" },
          { value: "documents", label: "Documents & agreement" },
        ]}
      />
      {!lender && (
        <p className="text-xs text-muted-foreground">
          Your lender chooses the agenda; both people can suggest changes in
          chat.
        </p>
      )}
      <DisclosureBlock title="Amount and proposed terms" defaultOpen>
        <p className="text-3xl font-extrabold tabular-nums">
          {money(room.proposal.amount)}
        </p>
        {room.kind === "investment" ? (
          <>
            <p className="text-sm">
              Investor share:{" "}
              <strong>
                {((room.proposal.share_bps || 0) / 100).toFixed(2)}%
              </strong>{" "}
              of interest actually collected from their allocated contribution.
            </p>
            <Note>
              Principal, late fees and uncollected interest are excluded. The
              investor bears allocated losses. A separate lender-paid{" "}
              {((room.proposal.fee_policy?.bps || 0) / 100).toFixed(2)}%
              demonstration fee is added; it does not reduce the contribution.
            </Note>
            <Form
              submit="Estimate my interest share"
              onSubmit={async (form) => {
                const interest = toCentavos(String(form.get("interest") || ""));
                const amount =
                  (BigInt(interest) * BigInt(room.proposal.share_bps || 0)) /
                  10000n;
                setProjection(
                  `Illustrative share: ${money(amount.toString())}. This is a hypothetical calculation, not a promised return.`,
                );
              }}
            >
              <Field
                label="Hypothetical collected interest (₱)"
                name="interest"
                inputMode="decimal"
                required
              />
            </Form>
            {projection && <Note>{projection}</Note>}
          </>
        ) : (
          room.proposal.disclosure && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Total interest</dt>
                <dd className="font-bold">
                  {money(room.proposal.disclosure.total_interest)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Total repayment</dt>
                <dd className="font-bold">
                  {money(room.proposal.disclosure.total_repayment)}
                </dd>
              </div>
            </dl>
          )
        )}
        {lender && !agreement && (
          <Form
            submit="Propose updated terms"
            disabled={disabled}
            onSubmit={async (form) => {
              await act({
                action: "propose",
                amount: toCentavos(String(form.get("amount") || "")),
                ...(room.kind === "investment"
                  ? { share_bps: percentBps(String(form.get("share") || "")) }
                  : {}),
              });
            }}
          >
            <Field
              label="Proposed amount (₱)"
              name="amount"
              defaultValue={pesoInput(room.proposal.amount)}
              inputMode="decimal"
              key={room.proposal_hash}
            />
            {room.kind === "investment" && (
              <Field
                label="Investor interest share (%)"
                name="share"
                inputMode="decimal"
                defaultValue={String((room.proposal.share_bps || 0) / 100)}
              />
            )}
          </Form>
        )}
        {confirm(
          meApproved
            ? "You approved this proposal"
            : "Approve current proposal",
          "Agree to the current proposal?",
          `Proposed amount: ${money(room.proposal.amount)}. This approval does not sign the contract.`,
          { action: "approve", expected_hash: room.proposal_hash },
          meApproved || !room.both_here,
        )}
      </DisclosureBlock>
      <DisclosureBlock title="Supporting evidence">
        <Note>
          Share only necessary redacted documents. A clean file scan does not
          prove identity or authenticity. Transfer screenshots do not establish
          settlement.
        </Note>
        {room.evidence.map((file) => (
          <div key={file.id} className="border-b border-border py-3">
            <p className="break-words text-sm font-bold">{file.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {file.owner_name} · {file.file_status} · authenticity not verified
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                disabled={file.file_status !== "clean"}
                onClick={() =>
                  void saveFile(
                    `/meetings/${room.id}/evidence/${file.id}`,
                  ).catch(setError)
                }
              >
                Open file
              </Button>
              {file.owner_id === memberId && !disabled && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    void api(`/meetings/${room.id}/evidence/${file.id}`, {
                      method: "DELETE",
                    })
                      .then(refresh)
                      .catch(setError)
                  }
                >
                  Revoke
                </Button>
              )}
            </div>
          </div>
        ))}
        {!disabled && (
          <Form
            submit="Share redacted evidence"
            disabled={disabled}
            onSubmit={async (form) => {
              form.set("consent", "share_with_counterparty");
              form.set("category", "redacted_evidence");
              await api(`/meetings/${room.id}/evidence`, {
                method: "POST",
                body: form,
              });
              await refresh();
            }}
          >
            <Field
              label="Document shared with this counterparty"
              name="file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              required
            />
            <Picker
              label="Category"
              value="redacted_evidence"
              onChange={() => {}}
              options={[
                {
                  value: "redacted_evidence",
                  label: "Redacted supporting evidence",
                },
              ]}
            />
          </Form>
        )}
        {confirm(
          meReviewed
            ? "You reviewed this evidence"
            : "Acknowledge evidence review",
          "Record your review?",
          `You acknowledge reviewing the current shared files. PixelVault does not certify their authenticity.`,
          { action: "review_evidence", expected_hash: room.evidence_hash },
          meReviewed,
        )}
      </DisclosureBlock>
      <DisclosureBlock title="Frozen agreement" defaultOpen>
        {!agreement ? (
          <>
            <Note>
              Both people must approve the current proposal and acknowledge the
              evidence before the lender prepares a contract.
            </Note>
            {lender && (
              <Picker
                label="Unused capital in proposed return"
                value={returnUnused ? "include" : "keep"}
                onChange={(v) => setReturnUnused(v === "include")}
                disabled={disabled}
                options={[
                  {
                    value: "keep",
                    label: "Keep unused capital allocated to the offer",
                  },
                  {
                    value: "include",
                    label: "Propose returning unused capital too",
                  },
                ]}
              />
            )}
            {lender &&
              confirm(
                "Prepare the agreement",
                "Freeze these agreed terms?",
                "This creates a versioned contract for separate review and acceptance.",
                { action: "prepare" },
                !room.both_here ||
                  !room.both_approved ||
                  !room.evidence_reviewed,
              )}
          </>
        ) : (
          <>
            <p className="break-all text-xs text-muted-foreground">
              SHA-256: {agreement.hash}
            </p>
            {room.investment ? (
              <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-4 font-sans text-sm leading-relaxed">
                {room.investment.body}
              </pre>
            ) : (
              <Action
                to={`/agreements/${agreement.id}`}
                variant="outline"
                className="w-full"
              >
                Read full terms and schedule
              </Action>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                void saveFile(
                  room.investment
                    ? `/meetings/${room.id}/investment-agreement`
                    : `/agreements/${agreement.id}/document`,
                ).catch(setError)
              }
            >
              <FileText />
              Download this version
            </Button>
            {confirm(
              accepted
                ? "You accepted this version"
                : "Accept this exact contract",
              "Accept the frozen contract?",
              `Read all terms and the downloaded document. You are accepting hash ${agreement.hash}. No funding occurs from this action.`,
              {
                action: "accept_contract",
                accepted: true,
                expected_hash: agreement.hash,
              },
              !!accepted || !room.both_here,
            )}
          </>
        )}
      </DisclosureBlock>
      {room.investment && (
        <DisclosureBlock title="Separate test funding" defaultOpen>
          <Note>
            All contribution and payout confirmations here are simulations. No
            real transfer or payment verification is available.
          </Note>
          {room.investment.fund ? (
            <>
              <Status value={room.investment.fund.status} />
              <p className="text-sm">
                Confirmed contribution:{" "}
                <strong>
                  {money(room.investment.fund.position.contributed)}
                </strong>
              </p>
              <p className="text-sm">
                Interest earned:{" "}
                <strong>{money(room.investment.fund.position.earnings)}</strong>
                . This is separate from lender settlement.
              </p>
              {lender &&
                confirm(
                  "Prepare a test payout",
                  "Prepare the current payout?",
                  "Uses current collected principal and allocated interest due, plus unused capital only if selected below.",
                  {
                    action: "prepare_payout",
                    confirmed_simulation: true,
                    return_unallocated: returnUnused,
                  },
                )}
              {room.investment.fund.payouts
                .filter((p) => p.status === "awaiting_investor")
                .map((payout) => (
                  <div
                    key={payout.id}
                    className="space-y-3 rounded-xl border border-border p-3"
                  >
                    <p className="text-sm">
                      Principal {money(payout.principal)} + earnings{" "}
                      {money(payout.earnings)}
                    </p>
                    {!lender &&
                      confirm(
                        "Confirm test payout received",
                        "Confirm simulated receipt?",
                        "This records only a test acknowledgment.",
                        {
                          action: "confirm_payout",
                          payout_id: payout.id,
                          confirmed_simulation: true,
                        },
                      )}
                    {confirm(
                      "Cancel pending test payout",
                      "Cancel this pending payout?",
                      "No simulated payout is finalized.",
                      {
                        action: "cancel_payout",
                        payout_id: payout.id,
                        confirmed_simulation: true,
                      },
                    )}
                  </div>
                ))}
            </>
          ) : (
            confirm(
              "Confirm test contribution",
              "Confirm simulated funding?",
              `Full contribution ${money(room.proposal.amount)} enters the test pot after both people separately confirm. The demonstration platform fee is added to the lender.`,
              {
                action: "confirm_test_funding",
                expected_hash: room.investment.hash,
                confirmed_simulation: true,
              },
              !room.investment.accepted || !room.both_here,
            )
          )}
          {!lender && (
            <Picker
              label="Public contributor circle"
              disabled={disabled}
              value={room.visibility}
              onChange={(value) => {
                if (!disabled)
                  void act({ action: "visibility", visibility: value }).catch(
                    setError,
                  );
              }}
              options={[
                { value: "anonymous", label: "Anonymous" },
                { value: "named", label: "Show my profile" },
              ]}
            />
          )}
        </DisclosureBlock>
      )}
      {room.loan_id && (
        <Action to={`/loans/${room.loan_id}`} className="w-full">
          View the shared loan
        </Action>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        A proposal, review acknowledgment, chat message or attendance check is
        not a contract signature or settlement confirmation.
      </p>
    </div>
  );
}
