import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCheck,
  FileCheck2,
  FileText,
  HandCoins,
  LockKeyhole,
  MessageSquare,
  Mic,
  Percent,
  Radio,
  Send,
  ShieldCheck,
  Video,
} from "lucide-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@pixelvault/ui";
import { useSession } from "../../app/session";
import { ThemeToggle } from "../../app/ThemeToggle";
import { SignOutButton } from "../../app/SignOutButton";
import {
  ActionLink,
  ContextIllustration,
  ErrorNotice,
  Loading,
  MemberAvatar,
} from "../../components";
import { label, money } from "../../lib/format";
import { meetingTime } from "./MeetingList";
import { RoomDocuments } from "./RoomDocuments";
import { useMeeting } from "./useMeeting";
import type { Meeting } from "./types";

const agendas = [
  { key: "funding", name: "Funding plan", Icon: HandCoins },
  { key: "earnings", name: "Earnings & responsibilities", Icon: Percent },
  { key: "documents", name: "Documents & agreement", Icon: FileCheck2 },
] as const;
const clock = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export function AgreementRoom() {
  const { id } = useParams();
  const { session } = useSession();
  const query = useMeeting(id);
  const [body, setBody] = useState(""),
    [counter, setCounter] = useState(false),
    [tab, setTab] = useState("conversation"),
    [localError, setLocalError] = useState<unknown>();
  if (query.isPending)
    return <Loading text="Opening your private meeting room…" />;
  if (query.error || !query.data)
    return (
      <ErrorNotice
        error={query.error || new Error("Room unavailable")}
        retry={() => void query.refetch()}
      />
    );
  const room = query.data,
    memberId = session?.member?.id,
    lender = room.lender.id === memberId;
  const act = async (data: Record<string, unknown>) => {
    setLocalError(null);
    try {
      return await query.act(data);
    } catch (problem) {
      setLocalError(problem);
      return null;
    }
  };
  const self = room.participants.find((p) => p.id === memberId);
  const canConfirm =
    room.both_here &&
    query.connection === "live" &&
    room.state === "negotiating";
  return (
    <div className="flex min-h-full min-w-0 flex-col text-foreground lg:h-full">
      <div className="mb-4 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 lg:grid-cols-[40px_minmax(0,1fr)_auto] lg:gap-y-0">
        <Link
          to="/meetings"
          className="col-start-1 row-start-1 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-muted-foreground! hover:text-primary! lg:w-10 lg:justify-center"
        >
          <ArrowLeft size={15} />
          <span className="lg:sr-only">Meeting rooms</span>
        </Link>
        <div className="col-start-2 row-start-1 flex items-center gap-1 lg:col-start-3">
          <span className="mr-2 text-[10px] text-muted-foreground">
            Test room · No real funds
          </span>
          <ThemeToggle />
          <SignOutButton inMeeting />
        </div>
        <header className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-start justify-between gap-3 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <div className="min-w-0">
            <h1 className="max-w-[38ch] text-2xl! font-extrabold! leading-tight! sm:text-3xl! lg:text-2xl!">
              {room.kind === "investment"
                ? "An investment, discussed together."
                : "A shared plan. Your own decision."}
            </h1>
            <Link
              to={`/offers/${room.offer.id}`}
              className="mt-2 block text-sm text-muted-foreground! hover:text-primary!"
            >
              {room.offer.title}
              <ArrowRight className="ml-2 inline size-3" />
            </Link>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs">
            <Radio
              className={`size-3.5 ${query.connection === "live" ? "text-[#047857] dark:text-[#6ee7b7]" : "text-muted-foreground"}`}
            />
            {query.connection === "live"
              ? "Live room"
              : query.connection === "connecting"
                ? "Connecting…"
                : "Reconnecting · updates may be delayed"}
          </div>
        </header>
      </div>
      <div className="mb-4 grid shrink-0 gap-4 rounded-[14px] border border-border bg-card p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid grid-cols-2 items-center gap-x-3 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-6">
          {room.participants.map((person) => (
            <div key={person.id} className="flex min-w-0 items-center gap-3">
              <MemberAvatar
                name={person.display_name}
                avatarKey={person.avatar_key}
                photoUrl={person.photo_url}
                reputation={person.reputation}
                size={46}
              />
              <div>
                <strong className="block text-xs">
                  {person.display_name}
                  {person.id === memberId ? " (you)" : ""}
                </strong>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {label(person.role)} ·{" "}
                  {person.here
                    ? "Here now"
                    : person.checked_in
                      ? "Away"
                      : person.schedule_accepted
                        ? "Time accepted"
                        : "Time not accepted"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {room.scheduled_at && self?.schedule_accepted && !self.checked_in && (
            <Button
              variant="outline"
              disabled={query.busy || room.state === "closed"}
              onClick={() => void act({ action: "check_in" })}
            >
              <CheckCheck size={16} />
              I'm here
            </Button>
          )}
          {self?.checked_in && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check size={16} />
              {room.both_here ? "Both here" : "Waiting for the other person"}
            </span>
          )}
          <CallInfo />
        </div>
      </div>
      {(localError || query.actionError) && (
        <div className="mb-4">
          <ErrorNotice error={localError || query.actionError} />
        </div>
      )}
      <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[210px_minmax(0,1fr)_285px] lg:grid-rows-[minmax(0,1fr)]">
        <aside className="min-h-0 min-w-0 space-y-4 lg:overflow-y-auto lg:overscroll-contain">
          <Schedule room={room} lender={lender} busy={query.busy} act={act} />
          <Checklist room={room} />
          <div className="px-4 pb-4">
            <Proposal room={room} lender={lender} busy={query.busy} act={act} />
          </div>
        </aside>
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="shrink-0 border-b border-border bg-muted/50 p-3">
            <p className="mb-3! text-xs text-muted-foreground lg:sr-only lg:mb-0!">
              {lender
                ? "Choose the agenda to discuss"
                : "The lender leads the agenda. You can respond or counter."}
            </p>
            <div className="flex flex-wrap gap-2" aria-label="Meeting agendas">
              {agendas.map(({ key, name, Icon }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={room.agenda === key ? "default" : "outline"}
                  aria-pressed={room.agenda === key}
                  disabled={
                    !lender || query.busy || room.state !== "negotiating"
                  }
                  onClick={() => void act({ action: "agenda", agenda: key })}
                >
                  <Icon size={15} />
                  {name}
                </Button>
              ))}
            </div>
          </div>
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="min-h-0 flex-1 gap-0!"
          >
            <TabsList className="m-3! grid! h-auto! w-auto! shrink-0 grid-cols-3! p-1!">
              <TabsTrigger
                className="min-h-10! gap-1! px-1! text-[11px]!"
                value="conversation"
              >
                <MessageSquare className="size-3.5" />
                Conversation
              </TabsTrigger>
              <TabsTrigger
                className="min-h-10! gap-1! px-1! text-[11px]!"
                value="agreement"
              >
                <FileText className="size-3.5" />
                Agreement
              </TabsTrigger>
              <TabsTrigger
                className="min-h-10! gap-1! px-1! text-[11px]!"
                value="documents"
              >
                <ShieldCheck className="size-3.5" />
                Documents
              </TabsTrigger>
            </TabsList>
            <TabsContent
              className="mt-0! min-h-0 min-w-0 p-4 pt-0 lg:overflow-y-auto"
              value="conversation"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base! font-extrabold!">
                  Your conversation
                </h2>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <LockKeyhole size={12} />
                  Two participants
                </span>
              </div>
              <div
                className="my-4 max-h-[480px] space-y-4 overflow-y-auto px-0.5 py-1 lg:max-h-none lg:overflow-visible"
                role="log"
                aria-label="Room conversation"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {room.earlier_messages_available && (
                  <p className="text-xs leading-relaxed! text-muted-foreground">
                    Showing the latest 100 messages. Earlier messages are
                    retained; browsing the archive is not available yet.
                  </p>
                )}
                {room.messages.length ? (
                  room.messages.map((message) => (
                    <article
                      key={message.id}
                      className={`flex items-start gap-2.5 ${message.sender.id === memberId ? "flex-row-reverse" : ""}`}
                    >
                      <MemberAvatar
                        name={message.sender.display_name}
                        avatarKey={message.sender.avatar_key}
                        photoUrl={message.sender.photo_url}
                        size={30}
                      />
                      <div
                        className={`max-w-[85%] rounded-xl p-3 ${message.sender.id === memberId ? "bg-accent" : "bg-card border border-border"}`}
                      >
                        <strong className="block text-[11px]">
                          {message.sender.display_name}
                        </strong>
                        <p className="mt-1.5! whitespace-pre-wrap text-sm leading-relaxed! [overflow-wrap:anywhere]">
                          {message.body}
                        </p>
                        <time
                          className="mt-2 block text-[10px] text-muted-foreground"
                          dateTime={message.created_at}
                        >
                          {clock(message.created_at)}
                        </time>
                        {message.sender.id !== memberId && (
                          <Link
                            className="mt-2 block text-[10px] text-muted-foreground! hover:underline"
                            to={`/reports/new?type=message&id=${message.id}`}
                          >
                            Report concern
                          </Link>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="grid justify-items-center gap-3 py-7 text-center">
                    <ContextIllustration
                      scene="shared-plan"
                      className="h-32! w-48! object-contain"
                    />
                    <strong className="text-sm">
                      A little room to understand each other.
                    </strong>
                    <p className="max-w-[38ch] text-xs leading-relaxed! text-muted-foreground">
                      Ask questions, discuss a proposal or request a change
                      before agreeing.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent
              className="mt-0! min-h-0 overflow-y-auto p-4 pt-0"
              value="agreement"
            >
              <Contract
                room={room}
                memberId={memberId}
                lender={lender}
                canConfirm={canConfirm}
                busy={query.busy}
                act={act}
              />
            </TabsContent>
            <TabsContent
              className="mt-0! min-h-0 overflow-y-auto p-4 pt-0"
              value="documents"
            >
              <RoomDocuments
                room={room}
                memberId={memberId}
                onReview={() =>
                  void act({
                    action: "review_evidence",
                    expected_hash: room.evidence_hash,
                  })
                }
              />
            </TabsContent>
          </Tabs>
          {tab === "conversation" && (
            <form
              noValidate
              className="grid shrink-0 gap-2 border-t border-border bg-card p-4 pt-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!body.trim()) {
                  setLocalError(new Error("Write a message before sending."));
                  return;
                }
                const result = await act({
                  action: counter ? "counter" : "message",
                  body,
                });
                if (result) {
                  setBody("");
                  setCounter(false);
                }
              }}
            >
              <Label htmlFor="room-message">
                {counter
                  ? "Describe your counterproposal"
                  : "Message the other participant"}
              </Label>
              <Textarea
                id="room-message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="h-16! min-h-16! resize-none"
                maxLength={4000}
                placeholder="Keep the discussion here, alongside the current terms."
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={counter}
                  onClick={() => setCounter((v) => !v)}
                >
                  {counter ? "Switch to message" : "Make a counterproposal"}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    query.busy || room.state === "closed" || !body.trim()
                  }
                >
                  <Send size={16} />
                  {query.busy
                    ? "Sending…"
                    : counter
                      ? "Send counterproposal"
                      : "Send message"}
                </Button>
              </div>
            </form>
          )}
        </section>
        <aside className="min-h-0 min-w-0 space-y-4 lg:overflow-y-auto lg:overscroll-contain">
          <section className="rounded-[14px] border border-border bg-card p-5">
            <h2 className="text-base! font-extrabold!">
              The proposal at a glance
            </h2>
            <span className="mt-5 block text-xs text-muted-foreground">
              {room.kind === "investment"
                ? "Proposed contribution"
                : "Requested principal"}
            </span>
            <strong className="mt-1 block text-2xl font-extrabold tabular-nums">
              {money(room.proposal.amount)}
            </strong>
            {room.kind === "investment" ? (
              <>
                <dl className="mt-5 grid gap-3 border-y border-border py-4">
                  <div className="flex justify-between gap-3 text-xs">
                    <dt className="text-muted-foreground">
                      Investor interest share
                    </dt>
                    <dd className="font-bold">
                      {((room.proposal.share_bps || 0) / 100).toFixed(2)}%
                    </dd>
                  </div>
                  <div className="text-xs">
                    <dt className="text-muted-foreground">
                      From your contribution's collected interest
                    </dt>
                    <dd className="mt-2 rounded-lg bg-accent p-3 leading-relaxed">
                      If attributable interest collected is ₱1,000, your share
                      would be{" "}
                      <strong>
                        {money(
                          Math.floor(
                            (100000 * (room.proposal.share_bps || 0)) / 10000,
                          ),
                        )}
                      </strong>
                      . This is an example, not a return forecast.
                    </dd>
                  </div>
                </dl>
                <p className="mt-4! text-xs leading-relaxed! text-muted-foreground">
                  You bear allocated losses. Capital and earnings are not
                  guaranteed. The lender pays a separate platform fee; its rate
                  is not configured.
                </p>
                {memberId === room.participant.id && (
                  <div className="mt-5 border-t border-border pt-4">
                    <Label
                      className="flex items-start gap-2 text-xs leading-relaxed!"
                      htmlFor="investor-anonymous"
                    >
                      <Checkbox
                        id="investor-anonymous"
                        checked={room.visibility === "anonymous"}
                        disabled={query.busy}
                        onCheckedChange={(v) =>
                          void act({
                            action: "visibility",
                            visibility: v === true ? "anonymous" : "named",
                          })
                        }
                      />
                      Appear anonymously if this contribution is later confirmed
                    </Label>
                    <p className="mt-2! text-[11px] text-muted-foreground">
                      Your legal identity remains known to the lender. No
                      investor circle is published for a pending pitch.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-4! text-xs leading-relaxed! text-muted-foreground">
                Repayments follow the full server-calculated schedule and
                disclosed costs in your agreement.
              </p>
            )}
            <div className="mt-5 space-y-2 border-t border-border pt-4">
              {room.participants.map((p) => (
                <p key={p.id} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-0.5 size-2 shrink-0 rounded-full ${room.approved_by.includes(p.id) ? "bg-primary" : "bg-muted-foreground"}`}
                  />
                  <span>
                    {p.display_name}:{" "}
                    {room.approved_by.includes(p.id)
                      ? "proposal agreed"
                      : "reviewing proposal"}
                  </span>
                </p>
              ))}
            </div>
            <Button
              className="mt-4 w-full! whitespace-normal!"
              variant={
                room.approved_by.includes(memberId || "")
                  ? "secondary"
                  : "default"
              }
              disabled={
                query.busy ||
                !canConfirm ||
                room.approved_by.includes(memberId || "")
              }
              onClick={() =>
                void act({
                  action: "approve",
                  expected_hash: room.proposal_hash,
                })
              }
            >
              <Check size={16} />
              {room.approved_by.includes(memberId || "")
                ? "You agreed to this proposal"
                : "Agree to this proposal"}
            </Button>
            <p className="mt-2! text-[11px] leading-relaxed! text-muted-foreground">
              {!room.both_here
                ? "Both people must accept the meeting time and check in before agreeing."
                : "This records proposal agreement only. Contract acceptance is a separate action."}
            </p>
          </section>
          <section className="rounded-[14px] border border-border bg-card p-5">
            <h2 className="text-sm! font-extrabold!">Room history</h2>
            <ol className="mt-4! grid list-none! gap-4 p-0!">
              {room.events
                .slice(-6)
                .reverse()
                .map((e) => (
                  <li key={e.id} className="text-xs">
                    <strong className="block font-semibold">
                      {label(e.kind.replaceAll(".", " "))}
                    </strong>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {e.actor} · {clock(e.created_at)}
                    </span>
                  </li>
                ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

type Act = (data: Record<string, unknown>) => Promise<Meeting | null>;
function Schedule({
  room,
  lender,
  busy,
  act,
}: {
  room: Meeting;
  lender: boolean;
  busy: boolean;
  act: Act;
}) {
  const [time, setTime] = useState("");
  return (
    <section className="rounded-[14px] border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm! font-extrabold!">
        <CalendarClock className="size-4 text-primary" />
        Your meeting
      </h2>
      <p className="mt-3! text-xs leading-relaxed! text-muted-foreground">
        {meetingTime(room.scheduled_at)}
      </p>
      {lender ? (
        <form
          noValidate
          className="mt-4 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (time)
              void act({
                action: "schedule",
                scheduled_at: time.trim().replace(" ", "T") + ":00+08:00",
              });
          }}
        >
          <Label htmlFor="meeting-time" className="text-xs">
            Date and time · Manila
          </Label>
          <Input
            className="min-w-0! w-full! text-[11px]!"
            id="meeting-time"
            type="text"
            placeholder="2026-10-28 19:10"
            aria-describedby="meeting-time-format"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <p
            id="meeting-time-format"
            className="text-[10px] text-muted-foreground"
          >
            YYYY-MM-DD HH:MM · 24-hour time
          </p>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={
              busy ||
              !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(time) ||
              room.state === "closed"
            }
          >
            Propose time
          </Button>
        </form>
      ) : (
        <Button
          className="mt-4 w-full!"
          variant="outline"
          size="sm"
          disabled={
            busy ||
            !room.scheduled_at ||
            room.state === "closed" ||
            room.participants.find((p) => p.id === room.participant.id)
              ?.schedule_accepted
          }
          onClick={() => void act({ action: "accept_schedule" })}
        >
          {room.participants.find((p) => p.id === room.participant.id)
            ?.schedule_accepted
            ? "Meeting time accepted"
            : "Accept meeting time"}
        </Button>
      )}
      <p className="mt-3! text-[11px] leading-relaxed! text-muted-foreground">
        Check in within one hour of the accepted time. Rescheduling requires new
        check-ins.
      </p>
    </section>
  );
}
function Checklist({ room }: { room: Meeting }) {
  const [expanded, setExpanded] = useState(false);
  const steps = [
    {
      text: "Schedule & check in",
      done: room.participants.every((p) => p.checked_in),
    },
    { text: "Review evidence", done: room.evidence_reviewed },
    { text: "Choose amount", done: room.both_approved },
    {
      text:
        room.kind === "investment"
          ? "Agree earnings & risk"
          : "Agree repayments",
      done: room.both_approved,
    },
    { text: "Review contract & fees", done: !!room.agreement },
    {
      text: "Both accept this version",
      done: room.agreement?.acceptances.length === 2,
    },
    { text: "Verify transfer", done: false },
    { text: "Activate & track", done: false },
  ];
  const visibleSteps = room.kind === "investment" ? steps.slice(0, 4) : steps;
  return (
    <section className="rounded-[14px] border border-border bg-card p-4">
      <h2 className="hidden text-sm! font-extrabold! lg:block">
        Agreement checklist
      </h2>
      <Button
        variant="ghost"
        className="w-full! justify-between! px-0! text-sm! lg:hidden!"
        aria-expanded={expanded}
        aria-controls="room-checklist"
        onClick={() => setExpanded((value) => !value)}
      >
        Agreement checklist
        <span className="text-xs text-muted-foreground">
          {expanded ? "Hide" : `${visibleSteps.length} steps`}
        </span>
      </Button>
      <ol
        id="room-checklist"
        className={`mt-4! list-none! gap-4 p-0! lg:grid ${expanded ? "grid" : "hidden"}`}
      >
        {visibleSteps.map((step, index) => (
          <li key={step.text} className="flex gap-2.5 text-xs">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${step.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground"}`}
            >
              {step.done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className="pt-1 leading-relaxed">{step.text}</span>
          </li>
        ))}
      </ol>
      {room.kind === "investment" && (
        <p className="mt-4! flex items-start gap-2 border-t border-border pt-3 text-[11px] leading-relaxed! text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
          Investment contracts, transfers and activation are not available in
          this phase.
        </p>
      )}
      <p
        className={`mt-4! border-t border-border pt-3 text-[10px] leading-relaxed! text-muted-foreground lg:block ${expanded ? "block" : "hidden"}`}
      >
        A checklist tick is not evidence of identity, a signature or settlement.
      </p>
    </section>
  );
}
function Proposal({
  room,
  lender,
  busy,
  act,
}: {
  room: Meeting;
  lender: boolean;
  busy: boolean;
  act: Act;
}) {
  const [amount, setAmount] = useState(String(room.proposal.amount / 100)),
    [share, setShare] = useState(String((room.proposal.share_bps || 0) / 100));
  useEffect(() => {
    setAmount(String(room.proposal.amount / 100));
    setShare(String((room.proposal.share_bps || 0) / 100));
  }, [room.proposal_version]);
  return (
    <section className="border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm">
          {agendas.find((a) => a.key === room.agenda)?.name}
        </strong>
        <span className="text-[10px] text-muted-foreground">
          Proposal v{room.proposal_version}
        </span>
      </div>
      <p className="mt-2! text-xs leading-relaxed! text-muted-foreground">
        {room.agenda === "funding"
          ? "Set the amount for this specific offer. Your proposal does not move money."
          : room.agenda === "earnings"
            ? room.kind === "investment"
              ? "Your percentage applies only to collected interest attributable to your contribution. Principal and penalties are excluded."
              : "Review the reducing-balance interest, full cost and exact repayment dates before accepting."
            : "Use the Documents tab for evidence and Agreement for the exact version you will accept."}
      </p>
      {lender && !room.agreement && (
        <form
          noValidate
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void act({
              action: "propose",
              amount: Math.round(Number(amount) * 100),
              ...(room.kind === "investment"
                ? { share_bps: Math.round(Number(share) * 100) }
                : {}),
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="proposal-amount" className="text-xs">
              Amount (₱)
            </Label>
            <Input
              id="proposal-amount"
              type="number"
              min="100"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {room.kind === "investment" && (
            <div className="grid gap-2">
              <Label htmlFor="proposal-share" className="text-xs">
                Investor share (%)
              </Label>
              <Input
                id="proposal-share"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={share}
                onChange={(e) => setShare(e.target.value)}
              />
            </div>
          )}
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={busy || room.state !== "negotiating"}
            className="sm:col-span-2"
          >
            Publish revised proposal
          </Button>
        </form>
      )}
    </section>
  );
}
function Contract({
  room,
  memberId,
  lender,
  canConfirm,
  busy,
  act,
}: {
  room: Meeting;
  memberId?: string;
  lender: boolean;
  canConfirm: boolean;
  busy: boolean;
  act: Act;
}) {
  const [accepted, setAccepted] = useState(false);
  useEffect(() => setAccepted(false), [room.agreement?.hash]);
  const agreement = room.agreement,
    hasAccepted = agreement?.acceptances.some((a) => a.member_id === memberId);
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl! font-extrabold!">
          Read it together. Accept for yourself.
        </h2>
        <p className="mt-2! text-sm leading-relaxed! text-muted-foreground">
          Proposal approvals, chat messages and attendance do not sign a
          contract. Each person accepts the same exact version separately.
        </p>
      </div>
      {room.kind === "investment" ? (
        <>
          <div className="rounded-xl bg-muted p-5">
            <h3 className="text-sm! font-bold!">
              Investment discussion summary
            </h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt>Proposed contribution</dt>
                <dd className="font-bold">{money(room.proposal.amount)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt>Share of attributable collected interest</dt>
                <dd className="font-bold">
                  {((room.proposal.share_bps || 0) / 100).toFixed(2)}%
                </dd>
              </div>
              <div>
                <dt className="font-bold">Capital at risk</dt>
                <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Investor bears allocated borrower losses. No guaranteed
                  capital. Return timing, exit terms and fee policy still
                  require an approved agreement.
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl border border-border p-4">
            <h3 className="flex items-center gap-2 text-sm! font-bold!">
              <LockKeyhole className="size-4" />
              Contract and funding are not available yet
            </h3>
            <ul className="mt-3! ml-4! list-disc! space-y-2 text-xs leading-relaxed text-muted-foreground">
              {room.funding.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="mt-3! text-xs text-muted-foreground">
              No capital has been credited and no investor earnings or payouts
              have been created.
            </p>
          </div>
        </>
      ) : agreement ? (
        <>
          <div className="rounded-xl bg-muted p-4">
            <h3 className="text-sm! font-bold!">
              Test agreement · version {agreement.version}
            </h3>
            <p className="mt-3! text-sm">
              Principal: <strong>{money(agreement.terms.principal)}</strong>
            </p>
            <p className="mt-2! text-sm">
              Total repayment:{" "}
              <strong>{money(agreement.disclosure.total_repayment)}</strong>
            </p>
            <p className="mt-3! break-all text-[10px] leading-relaxed! text-muted-foreground">
              Exact document hash: {agreement.hash}
            </p>
            <ActionLink
              className="mt-4"
              to={`/agreements/${agreement.id}`}
              variant="outline"
            >
              <FileText size={16} />
              Open full terms & schedule
            </ActionLink>
          </div>
          <div className="grid gap-2">
            {room.participants.map((p) => (
              <p key={p.id} className="flex items-center gap-2 text-xs">
                <CheckCheck
                  className={`size-4 ${agreement.acceptances.some((a) => a.member_id === p.id) ? "text-primary" : "text-muted-foreground"}`}
                />
                {p.display_name}:{" "}
                {agreement.acceptances.some((a) => a.member_id === p.id)
                  ? "accepted this version"
                  : "acceptance pending"}
              </p>
            ))}
          </div>
          {!hasAccepted && (
            <>
              <Label
                className="flex items-start gap-3 text-sm leading-relaxed!"
                htmlFor="accept-room-contract"
              >
                <Checkbox
                  id="accept-room-contract"
                  checked={accepted}
                  onCheckedChange={(value) => setAccepted(value === true)}
                />
                I have read the complete terms and accept this exact test
                agreement for myself.
              </Label>
              <Button
                disabled={busy || !canConfirm || !accepted}
                onClick={() =>
                  void act({
                    action: "accept_contract",
                    accepted: true,
                    expected_hash: agreement.hash,
                  })
                }
              >
                <FileCheck2 size={16} />
                Accept this exact test agreement
              </Button>
            </>
          )}
          {room.loan_id && (
            <ActionLink to={`/loans/${room.loan_id}`}>
              Open loan timeline
              <ArrowRight size={16} />
            </ActionLink>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-5">
          <ContextIllustration
            scene="shared-plan"
            className="mx-auto h-36! w-56! object-contain"
          />
          <p className="mt-3! text-sm leading-relaxed! text-muted-foreground">
            After both people agree to the proposal, the lender can reserve
            capacity and prepare the server-generated agreement.
          </p>
          {lender && (
            <Button
              className="mt-4"
              disabled={
                busy ||
                !canConfirm ||
                !room.both_approved ||
                !room.evidence_reviewed
              }
              onClick={() => void act({ action: "prepare" })}
            >
              <FileText size={16} />
              Prepare test agreement
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
function CallInfo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mic size={15} />
          <Video size={15} />
          Audio / video
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="call-info">
        <DialogTitle>Keep the conversation connected</DialogTitle>
        <DialogDescription id="call-info">
          Text chat is available. A private audio/video service isn't configured
          yet.
        </DialogDescription>
        <ContextIllustration
          scene="shared-plan"
          className="mx-auto h-44! w-64! object-contain"
        />
        <p className="text-sm leading-relaxed! text-muted-foreground">
          The planned Jitsi integration will let you choose microphone or camera
          after permission. No device starts automatically, and calls do not
          count as signatures or proof of payment.
        </p>
        <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          Private meetings need an approved host and room access controls.
          Public meeting links are not used as a fallback.
        </p>
      </DialogContent>
    </Dialog>
  );
}
