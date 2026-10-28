import { Link } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeftRight,
  Crown,
  HandCoins,
  HeartHandshake,
  LockKeyhole,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pixelvault/ui";
import type { LeaderboardPage } from "@pixelvault/contracts";
import { ApiError, apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import {
  ActionLink,
  Empty,
  ErrorNotice,
  Loading,
  MemberAvatar,
} from "../../components";
import { money } from "../../lib/format";
import { ReputationExplanation } from "./CommunityXpInfo";
import { BadgeStack } from "./BadgeStack";
import { XpCount } from "./XpCount";

type Entry = LeaderboardPage["entries"][number];
const number = (value: number) => value.toLocaleString("en-PH");

function MemberName({ entry }: { entry: Entry }) {
  return (
    <div className="min-w-0">
      <Link
        className="block text-sm font-extrabold text-foreground! transition-colors [overflow-wrap:anywhere] hover:text-primary! hover:underline focus-visible:text-primary!"
        to={`/members/${entry.handle}`}
      >
        {entry.display_name}
      </Link>
      <span className="mt-1 block text-xs text-muted-foreground">
        {entry.reputation.level}
      </span>
    </div>
  );
}

function PrivateValue() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <LockKeyhole size={13} aria-hidden="true" />
      Not shared
    </span>
  );
}

function Podium({ entries }: { entries: Entry[] }) {
  return (
    <ol
      className="my-6! grid list-none gap-4 p-0! lg:grid-cols-3 lg:items-end"
      aria-label="Top three contributors"
    >
      {entries.map((entry, index) => (
        <li
          key={entry.handle}
          data-podium-member={entry.handle}
          className={`group relative min-w-0 rounded-[14px] border border-border bg-card p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-[0_12px_28px_-16px_rgba(8,102,255,0.38)] focus-within:border-primary motion-reduce:transform-none ${index === 0 ? "lg:col-start-2 lg:row-start-1 lg:pt-7" : index === 1 ? "lg:col-start-1 lg:row-start-1" : "lg:col-start-3 lg:row-start-1"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <MemberAvatar
                name={entry.display_name}
                avatarKey={entry.avatar_key}
                photoUrl={entry.photo_url}
                reputation={entry.reputation}
                size={60}
              />
              <MemberName entry={entry} />
            </div>
            <span
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground"
              aria-label={`Rank ${entry.rank}`}
            >
              {entry.rank}
            </span>
          </div>
          {entry.rank === 1 && (
            <Crown
              className="absolute -top-4 right-5 size-7 fill-card text-primary transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transform-none"
              aria-hidden="true"
            />
          )}
          <div className="mt-5">
            <span className="block text-xs text-muted-foreground">
              Lifetime lent
            </span>
            <strong className="mt-1 block text-[1.65rem] font-extrabold tracking-tight text-foreground tabular-nums">
              {entry.lending ? (
                money(entry.lending.total_lent)
              ) : (
                <PrivateValue />
              )}
            </strong>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3">
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <HandCoins size={15} aria-hidden="true" />
                Loans funded
              </dt>
              <dd className="mt-1 text-sm font-bold tabular-nums">
                {entry.lending ? (
                  number(entry.lending.loans_funded)
                ) : (
                  <PrivateValue />
                )}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <HeartHandshake size={15} aria-hidden="true" />
                People helped
              </dt>
              <dd className="mt-1 text-sm font-bold tabular-nums">
                {entry.lending ? (
                  number(entry.lending.people_helped)
                ) : (
                  <PrivateValue />
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <BadgeStack
              badges={entry.badges ?? []}
              handle={entry.handle}
              name={entry.display_name}
            />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground">
                Reputation
              </span>
              <XpCount value={entry.reputation.points} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Summary({
  summary,
}: {
  summary: NonNullable<LeaderboardPage["summary"]>;
}) {
  const metrics = [
    {
      label: "Participating members",
      value: number(summary.participants),
      icon: Users,
    },
    {
      label: "Lifetime lent · shared",
      value: money(summary.total_lent),
      icon: Wallet,
    },
    {
      label: "Loans funded · shared",
      value: summary.loans_funded == null ? "—" : number(summary.loans_funded),
      icon: HandCoins,
    },
    {
      label: "Community reputation",
      value: `${number(summary.total_xp)} XP`,
      icon: Sparkles,
    },
  ];
  return (
    <dl
      className="my-4! grid grid-cols-2 gap-y-6 rounded-[14px] border border-border bg-card px-2 py-6 lg:grid-cols-4"
      aria-label="Opt-in community totals"
    >
      {metrics.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 px-3 lg:px-5"
        >
          <dt className="contents">
            <Icon
              className="col-start-1 row-span-2 row-start-1 size-5 text-primary"
              aria-hidden="true"
            />
            <span className="col-start-2 row-start-2 mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {label}
            </span>
          </dt>
          <dd className="col-start-2 row-start-1 text-sm font-extrabold tracking-tight break-words tabular-nums sm:text-lg xl:text-xl">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Leaderboard() {
  const client = useQueryClient();
  const { session } = useSession();
  const query = useInfiniteQuery({
    queryKey: ["community-leaderboard"],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiRequest<LeaderboardPage>(
        `/community/leaderboard?limit=25${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (page) => page.next_cursor || undefined,
  });
  const rows = query.data?.pages.flatMap((page) => page.entries) || [];
  const first = query.data?.pages[0];
  const remaining = rows.slice(3);
  return (
    <div className="leaderboard-workspace min-w-0 text-foreground">
      <header className="grid items-center gap-3 overflow-hidden rounded-[14px] bg-[#eff7ff] px-5 pt-6 dark:bg-[#142940] lg:grid-cols-[0.95fr_1.2fr] lg:py-7 lg:pr-0 lg:pl-8">
        <div className="relative z-1 min-w-0">
          <h1 className="text-[1.875rem]! leading-[1.12]! font-extrabold! tracking-[-0.035em]! sm:text-[2.125rem]! xl:text-[2.5rem]!">
            Community
            <br />
            <span className="text-[#0866ff] dark:text-primary">
              leaderboard.
            </span>
          </h1>
          <p className="mt-4! text-lg font-bold leading-snug! text-foreground">
            People behind the lending community.
          </p>
          <p className="mt-3! max-w-[49ch] text-sm leading-relaxed! text-muted-foreground">
            Explore member achievements and the lending history they choose to
            share. Clear records, real community.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5 [&_[data-slot=button]]:min-h-11 [&_[data-slot=button]]:text-left">
            <ReputationExplanation />
            <ActionLink
              to={session?.member ? "/profile/appearance" : "/sign-in"}
              variant="default"
            >
              <Users size={17} aria-hidden="true" />
              {session?.member
                ? "Manage my participation"
                : "Sign in to participate"}
              <ArrowRight size={16} aria-hidden="true" />
            </ActionLink>
          </div>
        </div>
        <img
          className="block h-auto w-full min-w-0 object-contain"
          src="/illustrations/community-podium.png"
          width="1774"
          height="887"
          alt=""
          fetchPriority="high"
        />
      </header>
      {query.isPending ? (
        <Loading text="Loading the community board…" />
      ) : query.error ? (
        <ErrorNotice
          error={
            query.error instanceof ApiError && query.error.status === 409
              ? new Error(
                  "The community board changed. Refresh to see the current rankings.",
                )
              : query.error
          }
          retry={() => {
            void client.resetQueries({
              queryKey: ["community-leaderboard"],
              exact: true,
            });
          }}
        />
      ) : (
        <>
          {first?.summary && <Summary summary={first.summary} />}
          <section
            className="mt-4 rounded-[14px] border border-border bg-card p-4 sm:p-6"
            aria-labelledby="community-board-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Trophy
                  className="mt-0.5 size-6 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h2
                    id="community-board-title"
                    className="text-xl! font-extrabold!"
                  >
                    Community leaders
                  </h2>
                  <p className="mt-1! text-xs text-muted-foreground">
                    Lending history, achievements, and the people behind them.
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">
                All time
              </span>
            </div>
            <p className="mt-4! text-xs text-muted-foreground">
              Ranked by community reputation · Equal scores share a rank
            </p>
            {rows.length ? (
              <>
                <Podium entries={rows.slice(0, 3)} />
                {remaining.length > 0 && (
                  <>
                    <p
                      id="board-table-scroll-hint"
                      className="mb-3! flex items-center gap-2 text-xs text-muted-foreground xl:hidden"
                    >
                      <ArrowLeftRight size={16} aria-hidden="true" />
                      Scroll sideways to compare all columns.
                    </p>
                    <div
                      className="overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&>[data-slot=table-container]]:overflow-visible"
                      role="region"
                      aria-label="Community contributor comparison"
                      aria-describedby="board-table-scroll-hint"
                      tabIndex={0}
                    >
                      <Table
                        className="w-full min-w-[760px] text-xs"
                        aria-label="More community contributors"
                      >
                        <TableHeader>
                          <TableRow className="border-border">
                            <TableHead
                              scope="col"
                              className="bg-muted px-3 py-3 text-[11px] text-muted-foreground"
                            >
                              Rank
                            </TableHead>
                            <TableHead
                              scope="col"
                              className="bg-muted px-3 text-[11px] text-muted-foreground"
                            >
                              Member
                            </TableHead>
                            <TableHead
                              scope="col"
                              className="bg-muted px-3 text-[11px] text-muted-foreground"
                            >
                              Lifetime lent
                            </TableHead>
                            <TableHead
                              scope="col"
                              className="bg-muted px-3 text-[11px] text-muted-foreground"
                            >
                              Loans funded
                            </TableHead>
                            <TableHead
                              scope="col"
                              className="bg-muted px-3 text-[11px] text-muted-foreground"
                            >
                              People helped
                            </TableHead>
                            <TableHead
                              scope="col"
                              className="bg-muted px-3 text-[11px] text-muted-foreground"
                            >
                              Reputation
                            </TableHead>
                            <TableHead
                              scope="col"
                              className="bg-muted px-3 text-[11px] text-muted-foreground"
                            >
                              Badges
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {remaining.map((entry) => (
                            <TableRow
                              key={entry.handle}
                              className="group border-border transition-colors duration-150 hover:bg-accent/60 focus-within:bg-accent/60"
                            >
                              <TableCell className="px-3 py-4">
                                <span
                                  className="font-bold text-muted-foreground"
                                  aria-label={`Rank ${entry.rank}`}
                                >
                                  {entry.rank}
                                </span>
                              </TableCell>
                              <TableCell className="px-3">
                                <div className="flex min-w-44 max-w-64 items-center gap-3 whitespace-normal">
                                  <MemberAvatar
                                    name={entry.display_name}
                                    avatarKey={entry.avatar_key}
                                    photoUrl={entry.photo_url}
                                    reputation={entry.reputation}
                                    size={42}
                                  />
                                  <MemberName entry={entry} />
                                </div>
                              </TableCell>
                              <TableCell className="px-3 font-bold tabular-nums">
                                {entry.lending ? (
                                  money(entry.lending.total_lent)
                                ) : (
                                  <PrivateValue />
                                )}
                              </TableCell>
                              <TableCell className="px-3 tabular-nums">
                                {entry.lending ? (
                                  number(entry.lending.loans_funded)
                                ) : (
                                  <PrivateValue />
                                )}
                              </TableCell>
                              <TableCell className="px-3 tabular-nums">
                                {entry.lending ? (
                                  number(entry.lending.people_helped)
                                ) : (
                                  <PrivateValue />
                                )}
                              </TableCell>
                              <TableCell className="px-3 font-bold text-primary tabular-nums">
                                {number(entry.reputation.points)} XP
                              </TableCell>
                              <TableCell className="px-3">
                                <BadgeStack
                                  badges={entry.badges ?? []}
                                  handle={entry.handle}
                                  name={entry.display_name}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
                <p className="my-4! text-xs text-muted-foreground">
                  Showing {number(rows.length)}
                  {first?.summary
                    ? ` of ${number(first.summary.participants)}`
                    : ""}{" "}
                  participating members.
                </p>
              </>
            ) : (
              <Empty title="There’s room for a first contributor." icon={Users}>
                Members can join the board and choose which lending totals to
                share.
              </Empty>
            )}
            {query.hasNextPage && (
              <Button
                variant="outline"
                disabled={query.isFetchingNextPage}
                onClick={() => {
                  void query.fetchNextPage();
                }}
              >
                Load more members
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            )}
            <footer className="mt-5 flex flex-col items-start justify-between gap-4 border-t border-border pt-5 xl:flex-row">
              <p className="max-w-[76ch] text-xs leading-relaxed! text-muted-foreground">
                Lifetime lent counts confirmed funding, including completed
                loans, for members who share these totals.{" "}
                {first?.summary?.lending_sharing_members ?? 0} members currently
                share lending history. Reputation reflects community
                contributions, not repayment ability or a guarantee.
              </p>
              <Link
                className="inline-flex shrink-0 items-center gap-2 rounded-md text-xs font-bold text-primary! transition-colors hover:underline"
                to="/explore"
              >
                Browse lending offers
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}
