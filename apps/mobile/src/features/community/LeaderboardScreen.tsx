import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  BadgeArt,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@pixelvault/ui";
import { Crown, Trophy } from "lucide-react";
import type {
  Award,
  AwardDefinition,
  LeaderboardPage,
} from "@pixelvault/contracts";
import {
  Action,
  Empty,
  ErrorState,
  Field,
  Illustration,
  Loading,
  Note,
  Page,
  PersonAvatar,
  money,
} from "../../components/ui";
import { api } from "../../app/api";
type Entry = LeaderboardPage["entries"][number];
function Count({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span className="tabular-nums" aria-label={`${value} XP`}>
      {shown.toLocaleString("en-PH")} XP
    </span>
  );
}
function Badges({
  awards,
  onSelect,
}: {
  awards: Award[];
  onSelect: (award: Award) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {awards.slice(0, 3).map((award) => (
          <Button
            key={award.id}
            variant="ghost"
            size="icon"
            className="size-11! rounded-full! bg-background/50! p-2!"
            aria-label={`View ${award.name}`}
            onClick={() => onSelect(award)}
          >
            <BadgeArt badgeKey={award.key} name={award.name} size={26} />
          </Button>
        ))}
        {awards.length > 3 && (
          <Button
            variant="outline"
            size="icon"
            className="size-11! rounded-full! text-xs"
            aria-label={`View ${awards.length - 3} more badges`}
            onClick={() => setOpen(true)}
          >
            +{awards.length - 3}
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Community achievements</DialogTitle>
          <DialogDescription>
            Select an achievement to read what it represents.
          </DialogDescription>
          <div className="grid grid-cols-3 gap-3">
            {awards.map((award) => (
              <Button
                key={award.id}
                variant="ghost"
                className="h-auto! min-h-24 flex-col! text-xs"
                onClick={() => {
                  setOpen(false);
                  onSelect(award);
                }}
              >
                <BadgeArt badgeKey={award.key} name={award.name} size={44} />
                {award.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
function Podium({
  entry,
  index,
  onSelect,
}: {
  entry: Entry;
  index: number;
  onSelect: (award: Award) => void;
}) {
  const colors = [
    "bg-podium-first text-podium-first-ink",
    "bg-podium-second text-podium-second-ink",
    "bg-podium-third text-podium-third-ink",
  ];
  return (
    <article className={`rounded-2xl p-4 ${colors[index]}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-current/20 text-lg font-extrabold">
          {index === 0 ? <Crown className="size-6" /> : index + 1}
        </span>
        <PersonAvatar person={entry} size={index === 0 ? 56 : 48} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-extrabold">
            {entry.display_name}
          </h2>
          <p className="mt-1 text-xs">{entry.reputation.level}</p>
          <strong className="mt-1 block text-xs">
            <Count value={entry.reputation.points} />
          </strong>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs opacity-80">All-time lending shared</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums">
            {entry.lending ? money(entry.lending.total_lent) : "Not shared"}
          </p>
          <p className="mt-1 text-xs">
            {entry.lending
              ? `${entry.lending.loans_funded} funded ${entry.lending.loans_funded === 1 ? "loan" : "loans"}, ${entry.lending.people_helped} ${entry.lending.people_helped === 1 ? "person" : "people"} helped`
              : "Public sharing is optional."}
          </p>
        </div>
        <Badges awards={entry.badges || []} onSelect={onSelect} />
      </div>
    </article>
  );
}
export function LeaderboardScreen({ full = false }: { full?: boolean }) {
  const [query, setQuery] = useState(""),
    [badges, setBadges] = useState<string[]>([]),
    [selected, setSelected] = useState<Award | null>(null);
  const catalog = useQuery({
    queryKey: ["mobile-badge-catalog"],
    queryFn: ({ signal }) =>
      api<{ catalog: AwardDefinition[] }>("/community/achievement-catalog", {
        signal,
      }),
  });
  const leaders = useInfiniteQuery({
    queryKey: ["mobile-leaderboard", full, query, badges],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        limit: full ? "25" : "10",
        ...(query ? { q: query } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      badges.forEach((badge) => params.append("badge", badge));
      return api<LeaderboardPage>(`/community/leaderboard?${params}`, {
        signal,
      });
    },
    getNextPageParam: (page) =>
      full ? page.next_cursor || undefined : undefined,
  });
  const entries = leaders.data?.pages.flatMap((page) => page.entries) || [];
  return (
    <Page
      title={full ? "The full community list." : "Community leaderboard."}
      description="Lending history, earned milestones and the people behind them."
      back
    >
      {!full && (
        <Illustration scene="community-podium" className="mx-auto max-w-80" />
      )}
      {full && (
        <>
          <Field
            label="Find a community member"
            name="member"
            value={query}
            maxLength={80}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or handle"
          />
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by public achievements"
          >
            {(catalog.data?.catalog || [])
              .filter((badge) => !badge.private)
              .map((badge) => (
                <Button
                  key={badge.key}
                  variant={badges.includes(badge.key) ? "secondary" : "outline"}
                  className="min-h-11 rounded-full text-xs"
                  aria-pressed={badges.includes(badge.key)}
                  onClick={() =>
                    setBadges((current) =>
                      current.includes(badge.key)
                        ? current.filter((key) => key !== badge.key)
                        : [...current, badge.key],
                    )
                  }
                >
                  <BadgeArt badgeKey={badge.key} name={badge.name} size={20} />
                  {badge.name}
                </Button>
              ))}
            {!!badges.length && (
              <Button
                variant="ghost"
                className="min-h-11 rounded-full text-xs"
                onClick={() => setBadges([])}
              >
                Clear filters
              </Button>
            )}
          </div>
        </>
      )}
      {leaders.isPending ? (
        <Loading />
      ) : leaders.error ? (
        <ErrorState error={leaders.error} retry={() => leaders.refetch()} />
      ) : !entries.length ? (
        <Empty
          title="The next chapter is still being written."
          scene="community-workshop"
        >
          Members appear when they choose to participate. Try another filter or
          return as the community grows.
        </Empty>
      ) : (
        <>
          {!full && (
            <div className="space-y-3">
              {entries.slice(0, 3).map((entry, index) => (
                <Podium
                  key={entry.handle}
                  entry={entry}
                  index={index}
                  onSelect={setSelected}
                />
              ))}
            </div>
          )}
          <div className="divide-y divide-border">
            {(full ? entries : entries.slice(3, 10)).map((entry) => (
              <article key={entry.handle} className="py-4">
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-xs font-bold text-muted-foreground">
                    {entry.position || entry.rank}
                  </span>
                  <PersonAvatar person={entry} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/members/${entry.handle}`}
                      className="text-sm font-bold hover:text-primary"
                    >
                      {entry.display_name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.reputation.points} XP
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">
                      {entry.lending
                        ? money(entry.lending.total_lent)
                        : "Not shared"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      all-time lent
                    </p>
                  </div>
                </div>
                <div className="mt-3 ml-9 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {entry.lending
                      ? `${entry.lending.loans_funded} loans funded`
                      : "Lending totals private"}
                  </p>
                  <Badges awards={entry.badges || []} onSelect={setSelected} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {!full ? (
        <Action to="/leaderboard/all" className="w-full">
          See full list
          <Trophy className="size-4" />
        </Action>
      ) : (
        leaders.hasNextPage && (
          <Button
            variant="outline"
            className="w-full"
            disabled={leaders.isFetchingNextPage}
            onClick={() => void leaders.fetchNextPage()}
          >
            {leaders.isFetchingNextPage ? "Loading…" : "Load more members"}
          </Button>
        )
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Community XP reflects learning and approved contributions. It does not
        affect loan approval. Lending totals appear only when the member shares
        them.
      </p>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          {selected && (
            <>
              <div className="mx-auto">
                <BadgeArt
                  badgeKey={selected.key}
                  name={selected.name}
                  size={88}
                />
              </div>
              <DialogTitle>{selected.name}</DialogTitle>
              <DialogDescription>
                {selected.criteria ||
                  "Recognition based on recorded community activity."}
              </DialogDescription>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
