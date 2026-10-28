import { Link, useSearchParams } from "react-router-dom";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Search, Users, X } from "lucide-react";
import { BadgeArt, Button, Input, Label } from "@pixelvault/ui";
import type { LeaderboardPage } from "@pixelvault/contracts";
import { ApiError, apiRequest } from "../../app/api";
import { Empty, ErrorNotice, Loading } from "../../components";
import { LeaderboardPeople, number } from "./LeaderboardPeople";

type Catalog = { catalog: { key: string; name: string; private: boolean }[] };

export function LeaderboardDirectory() {
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const search = params.get("q") ?? "";
  const selected = [...new Set(params.getAll("badge"))].sort();
  const key = ["community-leaderboard", "directory", search, selected];
  const catalog = useQuery({
    queryKey: ["achievement-catalog"],
    queryFn: ({ signal }) =>
      apiRequest<Catalog>("/community/achievement-catalog", { signal }),
  });
  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) => {
      const queryParams = new URLSearchParams({ limit: "25" });
      if (search.trim()) queryParams.set("q", search.trim());
      selected.forEach((badge) => queryParams.append("badge", badge));
      if (pageParam) queryParams.set("cursor", pageParam);
      return apiRequest<LeaderboardPage>(
        `/community/leaderboard?${queryParams}`,
        { signal },
      );
    },
    getNextPageParam: (page) => page.next_cursor || undefined,
  });
  const rows = query.data?.pages.flatMap((page) => page.entries) ?? [];
  const total = query.data?.pages[0].summary?.participants;
  function toggleBadge(badge: string) {
    const next = new URLSearchParams(params);
    next.delete("badge");
    (selected.includes(badge)
      ? selected.filter((value) => value !== badge)
      : [...selected, badge]
    ).forEach((value) => next.append("badge", value));
    setParams(next, { replace: true });
  }

  return (
    <div className="min-w-0 text-foreground">
      <Link
        to="/leaderboard"
        className="mb-4 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-muted-foreground! hover:text-primary!"
      >
        <ArrowLeft size={16} />
        Leaderboard
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl! font-extrabold! sm:text-3xl!">
          Community members
        </h1>
        <p className="mt-2! text-sm text-muted-foreground">
          Find people by name or their showcased achievements.
        </p>
      </header>
      <section
        aria-label="Filter community members"
        className="mb-6 space-y-4 border-b border-border pb-6"
      >
        <div className="max-w-md space-y-2">
          <Label htmlFor="leaderboard-member-search">Search members</Label>
          <div className="relative">
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="leaderboard-member-search"
              type="search"
              className="pl-10!"
              maxLength={80}
              value={search}
              placeholder="Name or public handle"
              onChange={(event) => {
                const next = new URLSearchParams(params);
                if (event.target.value) next.set("q", event.target.value);
                else next.delete("q");
                setParams(next, { replace: true });
              }}
            />
          </div>
        </div>
        <div>
          <h2
            id="leaderboard-badge-filter-title"
            className="mb-3! text-xs! font-bold!"
          >
            Showcased badges
          </h2>
          <p id="leaderboard-badge-filter-help" className="sr-only">
            Show members with any selected badge. Only publicly showcased
            achievements match.
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby="leaderboard-badge-filter-title"
            aria-describedby="leaderboard-badge-filter-help"
          >
            <Button
              variant={!selected.length ? "default" : "outline"}
              aria-pressed={!selected.length}
              className="rounded-full! px-4! text-xs!"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete("badge");
                setParams(next, { replace: true });
              }}
            >
              <Users size={15} />
              All members
            </Button>
            {catalog.data?.catalog
              .filter((badge) => !badge.private)
              .map((badge) => (
                <Button
                  key={badge.key}
                  variant={selected.includes(badge.key) ? "default" : "outline"}
                  aria-pressed={selected.includes(badge.key)}
                  aria-label={`Show members with ${badge.name}`}
                  className="gap-2! rounded-full! px-3! text-xs! transition-colors"
                  onClick={() => toggleBadge(badge.key)}
                >
                  <BadgeArt
                    name={badge.name}
                    badgeKey={badge.key}
                    size={24}
                    className="size-6! rounded-full bg-white"
                  />
                  {badge.name}
                  {selected.includes(badge.key) && (
                    <Check size={14} aria-hidden="true" />
                  )}
                </Button>
              ))}
          </div>
          {catalog.isPending && (
            <p className="mt-3! text-xs text-muted-foreground" role="status">
              Loading badge filters…
            </p>
          )}
          {catalog.error && (
            <ErrorNotice
              error={catalog.error}
              retry={() => void catalog.refetch()}
            />
          )}
        </div>
        {(search || selected.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setParams({}, { replace: true })}
          >
            <X size={14} />
            Clear filters
          </Button>
        )}
      </section>
      {query.isPending ? (
        <Loading text="Finding community members…" />
      ) : query.error ? (
        <ErrorNotice
          error={
            query.error instanceof ApiError && query.error.status === 409
              ? new Error(
                  "The community list changed. Refresh to continue from the first page.",
                )
              : query.error
          }
          retry={() => void client.resetQueries({ queryKey: key, exact: true })}
        />
      ) : (
        <section aria-label="Community member results">
          <p className="mb-4! text-xs text-muted-foreground" role="status">
            Showing {number(rows.length)}
            {total == null ? "" : ` of ${number(total)}`} members
            {query.isFetching ? " · Updating…" : ""}
          </p>
          {rows.length ? (
            <LeaderboardPeople entries={rows} />
          ) : (
            <Empty title="No members match these filters." icon={Search}>
              Try another name or clear the badge toggles.
            </Empty>
          )}
          {query.hasNextPage && (
            <Button
              variant="outline"
              className="mt-5"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? "Loading…" : "Load more members"}
              <ArrowRight size={16} />
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
