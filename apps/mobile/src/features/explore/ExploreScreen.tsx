import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Map, Trophy, Bookmark, MapPin, List, RefreshCw } from "lucide-react";
import { Button, PlaceSearch } from "@pixelvault/ui";
import {
  Action,
  Empty,
  ErrorState,
  Loading,
  Page,
  PersonAvatar,
  date,
} from "../../components/ui";
import { api } from "../../app/api";
import { mapToken, useDiscovery } from "./data";
import { OfferCard } from "./OfferCard";
export function ExploreScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [recent, setRecent] = useState(false);
  const discovery = useDiscovery();
  const activity = useQuery({
    queryKey: ["mobile-community-activity"],
    queryFn: ({ signal }) =>
      api<{
        posts: {
          id: string;
          title: string;
          area: { name: string };
          lender: import("@pixelvault/contracts").Person;
          created_at: string;
        }[];
      }>("/community/activity", { signal }),
    enabled: recent,
    refetchInterval: recent ? 15_000 : false,
    refetchIntervalInBackground: false,
  });
  const offers = (
    discovery.data?.pages.flatMap((page) => page.offers) || []
  ).filter((offer) =>
    `${offer.title} ${offer.lender.display_name} ${offer.area.name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Page
      title="Meet your lending community."
      description="People nearby. Clear terms. A private next step."
      action={
        <Action
          to={`/map${query ? `?q=${encodeURIComponent(query)}` : ""}`}
          variant="outline"
        >
          <Map className="size-5" />
          <span className="sr-only">Open map</span>
        </Action>
      }
    >
      <div className="[&_input]:text-base!">
        <PlaceSearch
          token={mapToken()}
          value={query}
          onChange={setQuery}
          onSelect={(place) => {
            setQuery(place.name);
            setParams({ q: place.name });
            navigate(
              `/map?lng=${place.center[0]}&lat=${place.center[1]}&place=${encodeURIComponent(place.name)}`,
            );
          }}
        />
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Search suggestions"
      >
        {["All offers", "Quezon City", "Manila", "Makati", "Pasig"].map(
          (name) => (
            <Button
              key={name}
              variant={
                query === (name === "All offers" ? "" : name)
                  ? "secondary"
                  : "outline"
              }
              className="min-h-11 shrink-0 rounded-full! text-xs"
              aria-pressed={query === (name === "All offers" ? "" : name)}
              onClick={() => setQuery(name === "All offers" ? "" : name)}
            >
              {name}
            </Button>
          ),
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          className="min-h-11 gap-2 px-0! text-sm font-bold"
          aria-pressed={recent}
          onClick={() => setRecent(!recent)}
        >
          <RefreshCw className="size-4" />
          {recent ? "Recent posts" : "Lending offers"}
        </Button>
        <div className="flex gap-2">
          <Action to="/saved" variant="ghost">
            <Bookmark className="size-4" />
            <span className="sr-only">Saved offers</span>
          </Action>
          <Action to="/leaderboard" variant="ghost">
            <Trophy className="size-4" />
            <span className="sr-only">Community leaderboard</span>
          </Action>
        </div>
      </div>
      {recent ? (
        activity.isPending ? (
          <Loading />
        ) : activity.error ? (
          <ErrorState error={activity.error} retry={() => activity.refetch()} />
        ) : (
          <div className="divide-y divide-border">
            {activity.data?.posts.map((post) => (
              <Link
                key={post.id}
                to={`/offers/${post.id}`}
                className="flex min-h-24 items-center gap-3 py-4"
              >
                <PersonAvatar person={post.lender} />
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {post.lender.display_name} posted an offer
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {post.title}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {post.area.name} on {date(post.created_at)}
                  </p>
                </div>
              </Link>
            ))}
            {!activity.data?.posts.length && (
              <Empty title="No recent posts yet." scene="community-workshop">
                New published offers appear here as the community posts them.
              </Empty>
            )}
          </div>
        )
      ) : discovery.isPending ? (
        <Loading />
      ) : discovery.error ? (
        <ErrorState error={discovery.error} retry={() => discovery.refetch()} />
      ) : (
        <>
          <p role="status" className="text-xs text-muted-foreground">
            {offers.length} loaded {offers.length === 1 ? "offer" : "offers"}
            {query ? ` matching “${query}”` : ""}
          </p>
          <div className="space-y-3">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
          {!offers.length && (
            <Empty title="A different search might help.">
              Try a nearby city or a lender’s name.
            </Empty>
          )}
          {discovery.hasNextPage && (
            <Button
              variant="outline"
              className="w-full"
              disabled={discovery.isFetchingNextPage}
              onClick={() => void discovery.fetchNextPage()}
            >
              {discovery.isFetchingNextPage ? "Loading…" : "Load more offers"}
            </Button>
          )}
        </>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Offers show declared availability, not money held by PixelVault.
        Verification is a recorded check, never a repayment guarantee.
      </p>
    </Page>
  );
}
