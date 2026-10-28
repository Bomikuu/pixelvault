import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarClock,
  HandCoins,
  MessageSquare,
  Users,
} from "lucide-react";
import {
  ActionLink,
  ContextIllustration,
  Empty,
  ErrorNotice,
  Loading,
  MemberAvatar,
} from "../../components";
import { apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import { money } from "../../lib/format";
import type { MeetingSummary } from "./types";
export const meetingTime = (at: string | null) =>
  at
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(at)) + " · Manila"
    : "Time not set";
export function MeetingList({
  investments = false,
}: {
  investments?: boolean;
}) {
  const { session } = useSession();
  const query = useQuery({
    queryKey: ["meetings", session?.member?.id],
    queryFn: () => apiRequest<{ rooms: MeetingSummary[] }>("/meetings"),
    refetchInterval: 15_000,
  });
  const rows =
    query.data?.rooms.filter((r) => !investments || r.kind === "investment") ||
    [];
  return (
    <div className="mx-auto max-w-[1400px] text-foreground">
      <header className="grid items-center gap-4 overflow-hidden rounded-[14px] bg-accent p-6 sm:grid-cols-[1fr_240px]">
        <div>
          <h1 className="text-3xl! font-extrabold! tracking-tight!">
            {investments
              ? "Build a proposal together."
              : "A clear agreement starts here."}
          </h1>
          <p className="mt-3! max-w-[62ch] text-sm leading-relaxed! text-muted-foreground">
            {investments
              ? "Discuss a contribution with a lender, agree on your share and keep every decision on record."
              : "Schedule a private meeting, work through the same terms and confirm your own decisions."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionLink to="/explore?view=list">
              <HandCoins size={17} />
              Explore offers
            </ActionLink>
            {investments && (
              <ActionLink to="/meetings" variant="outline">
                <CalendarClock size={17} />
                All meeting rooms
              </ActionLink>
            )}
          </div>
        </div>
        <div className="hidden sm:block">
          <ContextIllustration scene="shared-plan" />
        </div>
      </header>
      <div className="my-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg! font-extrabold!">
          <CalendarClock className="size-5 text-primary" />
          {investments ? "Investment discussions" : "Your meeting rooms"}
        </h2>
        <span className="text-xs text-muted-foreground">
          Private · Test environment
        </span>
      </div>
      {query.isPending ? (
        <Loading text="Opening your meeting list…" />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : rows.length ? (
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          {rows.map((room) => {
            const other =
              room.lender.id === session?.member?.id
                ? room.participant
                : room.lender;
            return (
              <Link
                key={room.id}
                to={`/meetings/${room.id}`}
                className="group grid gap-4 border-b border-border p-5 text-foreground! transition-colors last:border-0 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[1fr_auto]"
              >
                <div className="flex min-w-0 gap-4">
                  <MemberAvatar
                    name={other.display_name}
                    avatarKey={other.avatar_key}
                    photoUrl={other.photo_url}
                    reputation={other.reputation}
                    size={48}
                  />
                  <div className="min-w-0">
                    <strong className="block text-sm group-hover:text-primary">
                      {other.display_name}
                    </strong>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {room.offer.title}
                    </span>
                    <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock size={14} />
                      {meetingTime(room.scheduled_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span>
                    <strong className="block text-right text-lg font-extrabold tabular-nums">
                      {money(room.amount)}
                    </strong>
                    <span className="mt-1 block text-right text-xs text-muted-foreground">
                      {room.kind === "investment"
                        ? "Investor pitch"
                        : "Borrowing proposal"}{" "}
                      · {room.state}
                    </span>
                  </span>
                  <ArrowUpRight className="size-5 text-primary" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty
          title={
            investments
              ? "Your first conversation starts with a lender."
              : "No meetings scheduled yet."
          }
          icon={Users}
          action={
            <ActionLink to="/explore?view=list">Find an offer</ActionLink>
          }
        >
          Open an offer to send an investor pitch, or open a private application
          to meet with the other person.
        </Empty>
      )}
      <p className="mt-5! flex items-start gap-2 text-xs leading-relaxed! text-muted-foreground">
        <MessageSquare className="mt-0.5 size-4 shrink-0" />A meeting, proposal
        approval or uploaded receipt does not transfer funds. Investment funding
        and earnings payouts are not enabled.
      </p>
    </div>
  );
}
