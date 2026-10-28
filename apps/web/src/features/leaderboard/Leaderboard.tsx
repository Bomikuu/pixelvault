import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Crown,
  HandCoins,
  HeartHandshake,
  Users,
} from "lucide-react";
import type { LeaderboardPage } from "@pixelvault/contracts";
import { apiRequest } from "../../app/api";
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
import {
  LeaderboardPeople,
  MemberName,
  PrivateValue,
  number,
  type LeaderboardEntry as Entry,
} from "./LeaderboardPeople";

const podiumTreatments = [
  "border-[#e4b442] bg-[#fff6d9] dark:border-[#806225] dark:bg-[#352b16]",
  "border-[#9db5d2] bg-[#edf4fc] dark:border-[#4a6687] dark:bg-[#1b2b40]",
  "border-[#d6a086] bg-[#fff0e7] dark:border-[#8c5b40] dark:bg-[#38261f]",
];
const medalTreatments = [
  "bg-[#f4c64d] text-[#503800] shadow-[0_5px_12px_-5px_#8a6000]",
  "bg-[#c6d9ef] text-[#243f60] shadow-[0_5px_12px_-5px_#45658a]",
  "bg-[#e6b197] text-[#5b2e1b] shadow-[0_5px_12px_-5px_#88533b]",
];
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
          className={`group relative min-w-0 rounded-[14px] border p-5 ${podiumTreatments[index]} transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-[0_12px_28px_-16px_rgba(8,102,255,0.38)] focus-within:border-primary motion-reduce:transform-none ${index === 0 ? "lg:col-start-2 lg:row-start-1 lg:pt-7" : index === 1 ? "lg:col-start-1 lg:row-start-1" : "lg:col-start-3 lg:row-start-1"}`}
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
              className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-white/70 text-xl font-extrabold ${medalTreatments[index]}`}
              aria-label={`Leaderboard position ${index + 1}`}
            >
              {index + 1}
            </span>
          </div>
          {index === 0 && (
            <Crown
              className="absolute -top-4 right-5 size-7 fill-[#f4c64d] text-[#8a6000] dark:text-[#f4c64d] transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transform-none"
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

export function Leaderboard() {
  const query = useQuery({
    queryKey: ["community-leaderboard", "preview"],
    queryFn: ({ signal }) =>
      apiRequest<LeaderboardPage>("/community/leaderboard?limit=10", {
        signal,
      }),
  });
  const rows = (query.data?.entries ?? []).slice(0, 10);
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
            <ActionLink to="/leaderboard/members">
              <Users size={17} aria-hidden="true" />
              See full list
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
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : (
        <section className="mt-6 min-w-0" aria-label="Leaderboard preview">
          {rows.length ? (
            <>
              <Podium entries={rows.slice(0, 3)} />
              {rows.length > 3 && (
                <LeaderboardPeople entries={rows.slice(3)} startPosition={4} />
              )}
            </>
          ) : (
            <Empty title="There’s room for a first contributor." icon={Users}>
              Members can join the board and choose which lending totals to
              share.
            </Empty>
          )}
          <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">
              Up to 10 members · Includes the top three
            </span>
            <Link
              className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-primary! hover:underline"
              to="/explore"
            >
              Browse lending offers
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </footer>
        </section>
      )}
    </div>
  );
}
