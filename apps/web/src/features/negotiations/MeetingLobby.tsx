import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  Clock3,
  Headphones,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@pixelvault/ui";
import {
  ActionLink,
  ContextIllustration,
  ErrorNotice,
  IllustratedInfoDialog,
  MemberAvatar,
} from "../../components";
import { ThemeToggle } from "../../app/ThemeToggle";
import { SignOutButton } from "../../app/SignOutButton";
import { DevicePreview } from "./DevicePreview";
import { RoomSchedule } from "./RoomSchedule";
import { meetingTime } from "./MeetingList";
import type { Meeting } from "./types";
import type { useMeeting } from "./useMeeting";

export function MeetingLobby({
  query,
  memberId,
  enter,
}: {
  query: ReturnType<typeof useMeeting>;
  memberId: string;
  enter: () => Promise<void>;
}) {
  const room = query.data!;
  const [error, setError] = useState<unknown>();
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const clock = useMemo(
    () => ({
      server: new Date(room.server_time).getTime(),
      client: Date.now(),
    }),
    [room.server_time],
  );
  const now = clock.server + Math.max(0, tick - clock.client);
  const self = room.participants.find((person) => person.id === memberId)!;
  const other = room.participants.find((person) => person.id !== memberId)!;
  const accepted = room.participants.every(
    (person) => person.schedule_accepted,
  );
  const scheduled = room.scheduled_at
    ? new Date(room.scheduled_at).getTime()
    : null;
  const inWindow = scheduled !== null && Math.abs(now - scheduled) <= 3600000;
  const history = room.state !== "negotiating";
  const canEnter = history || (accepted && inWindow);
  const cooldown = Math.max(
    0,
    Math.ceil(
      ((room.pings?.next_allowed_at
        ? new Date(room.pings.next_allowed_at).getTime()
        : 0) -
        now) /
        1000,
    ),
  );
  const act = async (data: Record<string, unknown>) => {
    setError(null);
    try {
      return await query.act(data);
    } catch (problem) {
      setError(problem);
      return null;
    }
  };
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col pb-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/meetings"
          className="flex min-h-11 items-center gap-2 text-xs font-bold text-muted-foreground! hover:text-primary!"
        >
          <ArrowLeft size={16} />
          Meeting rooms
        </Link>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-[10px] text-muted-foreground">
            Test room · no real funds
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
      <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div className="min-w-0 space-y-6">
          <header>
            <h1 className="text-3xl! font-extrabold leading-tight tracking-tight">
              Your meeting starts here.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Agree on a time, let the other person know you’re here, and check
              your setup.
            </p>
            <Link
              to={`/offers/${room.offer.id}`}
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary!"
            >
              {room.offer.title}
              <ArrowRight size={15} />
            </Link>
          </header>
          <section
            className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            aria-labelledby="lobby-people"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="lobby-people" className="text-sm font-extrabold">
                Who’s joining
              </h2>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <LockKeyhole size={13} />
                Just the two of you
              </span>
            </div>
            <div className="space-y-4">
              {room.participants.map((person) => (
                <div
                  key={person.id}
                  className="flex min-w-0 items-center gap-3"
                >
                  <MemberAvatar
                    name={person.display_name}
                    avatarKey={person.avatar_key}
                    photoUrl={person.photo_url}
                    reputation={person.reputation}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">
                      {person.display_name}
                      {person.id === memberId ? " (you)" : ""}
                    </strong>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {person.id === memberId || person.in_lobby
                        ? "In the waiting room"
                        : person.here
                          ? "Inside the meeting"
                          : person.last_seen_label ||
                            "Not in the waiting room yet"}
                    </span>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                    {person.schedule_accepted ? (
                      <Check size={13} className="text-primary" />
                    ) : (
                      <Clock3 size={13} />
                    )}
                    {person.schedule_accepted
                      ? "Time accepted"
                      : "Time pending"}
                  </span>
                </div>
              ))}
            </div>
            {!history && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="max-w-[30ch] text-xs leading-relaxed text-muted-foreground">
                  Send a gentle reminder to the private conversation.
                </p>
                <Button
                  variant="outline"
                  disabled={query.busy || cooldown > 0}
                  onClick={() => void act({ action: "ping" })}
                >
                  <BellRing size={15} />
                  {cooldown
                    ? `Ping again in ${cooldown}s`
                    : `Ping ${other.display_name.split(" ")[0]}`}
                </Button>
              </div>
            )}
            {room.pings?.last_received_at && (
              <p
                role="status"
                className="mt-3 rounded-xl bg-accent p-3 text-xs text-accent-foreground"
              >
                {room.pings.from_name} pinged you. Your waiting room is ready to
                check.
              </p>
            )}
            {room.pings?.last_sent_at && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Your last ping is in the private conversation. Delivery outside
                PixelVault is not enabled.
              </p>
            )}
          </section>
          <RoomSchedule
            room={room}
            lender={room.lender.id === memberId}
            busy={query.busy}
            act={act}
          />
          <section
            aria-labelledby="meeting-guide"
            className="overflow-hidden rounded-2xl bg-accent p-5 text-accent-foreground"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="meeting-guide" className="text-lg font-extrabold">
                  From hello to a shared plan.
                </h2>
                <p className="mt-2 max-w-[34ch] text-xs leading-relaxed">
                  A quick guide before your private conversation.
                </p>
              </div>
              <ContextIllustration
                scene="shared-plan"
                className="h-28! w-32! shrink-0 object-contain sm:h-36! sm:w-44!"
              />
            </div>
            <ol className="mt-4 grid gap-4 border-t border-primary/20 pt-4 sm:grid-cols-3">
              {[
                {
                  name: "Agree on a time",
                  detail:
                    "The lender proposes a Manila time. Each person accepts it.",
                  Icon: CalendarClock,
                },
                {
                  name: "Check your setup",
                  detail:
                    "Preview devices privately, or keep them off and use text.",
                  Icon: Headphones,
                },
                {
                  name: "Enter together",
                  detail:
                    "Check in yourself. Review terms before making any decision.",
                  Icon: Check,
                },
              ].map((step, index) => (
                <li key={step.name}>
                  <span className="mb-2 flex items-center gap-2 text-xs font-extrabold">
                    <step.Icon size={16} />
                    {index + 1}. {step.name}
                  </span>
                  <p className="text-[11px] leading-relaxed">{step.detail}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-0 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <DevicePreview person={self} />
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock size={15} />
                {meetingTime(room.scheduled_at)}
              </p>
              <Button
                className="w-full"
                disabled={query.busy || !canEnter}
                onClick={() => void enter()}
              >
                <ArrowRight size={17} />
                {query.busy
                  ? "Opening…"
                  : history
                    ? "View meeting record"
                    : "Enter room"}
              </Button>
              {(error || query.actionError) && (
                <div className="mt-3">
                  <ErrorNotice error={error || query.actionError} />
                </div>
              )}
              {!history && !canEnter && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {!accepted
                    ? "Both people need to accept the current meeting time before entering."
                    : "Entry opens one hour before the meeting and closes one hour after. Ask the lender to reschedule if needed."}
                </p>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Device preview is optional. Entering does not accept terms,
                create a contract or transfer money.
              </p>
            </div>
          </div>
          <IllustratedInfoDialog
            title="Meet, review, decide."
            description="You stay in control of every step."
            scene="shared-plan"
            triggerLabel="How this meeting works"
          >
            <ol className="list-decimal space-y-3 pl-5 text-sm">
              <li>
                Agree on the same scheduled occurrence. Rescheduling clears old
                check-ins.
              </li>
              <li>
                Ping the other person in your private conversation, then preview
                your own devices if you want.
              </li>
              <li>
                Enter with text chat. Both people independently review the same
                proposal and documents before financial approvals.
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Camera and microphone previews are local. A private live call
              provider is still required for shared audio/video.
            </p>
          </IllustratedInfoDialog>
        </aside>
      </div>
    </div>
  );
}
