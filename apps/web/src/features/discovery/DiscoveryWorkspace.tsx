import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Button } from "@pixelvault/ui";
import {
  ArrowRight,
  HandCoins,
  Newspaper,
  Radio,
  RefreshCw,
} from "lucide-react";
import { Empty, ErrorNotice, Loading, MemberAvatar } from "../../components";
import { date } from "../../lib/format";
import { CommunityMap } from "./CommunityMap";
import { DiscoveryOfferCard } from "./DiscoveryOfferCard";
import { DiscoverySuggestions } from "./DiscoverySuggestions";
import { DiscoveryOfferItem } from "./DiscoveryOfferItem";
import { ExploreControls } from "./ExploreControls";
import { DEFAULT_PLACE, distanceKm, publicAreaCenter } from "./geography";
import { useCommunityActivity } from "./useCommunityActivity";
import { mapboxPublicToken, type DiscoveryOffer, type MapPlace } from "./types";
import "./discovery.css";
interface Props {
  offers: DiscoveryOffer[];
  areas: string[];
  search: string;
  area: string;
  sort: string;
  minimum: string;
  view: string;
  radius: number;
  setFilter: (key: string, value: string) => void;
  setFilters: (values: Record<string, string>) => void;
  onClear: () => void;
  pending: boolean;
  error: unknown;
  retry: () => void;
  hasNext: boolean;
  fetchingNext: boolean;
  loadNext: () => void;
}
export function DiscoveryWorkspace({
  offers: loadedOffers,
  areas,
  search,
  area,
  sort,
  minimum,
  view,
  radius,
  setFilter,
  setFilters,
  onClear,
  pending,
  error,
  retry,
  hasNext,
  fetchingNext,
  loadNext,
}: Props) {
  const token = mapboxPublicToken();
  const [place, setPlace] = useState<MapPlace>(DEFAULT_PLACE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [feed, setFeed] = useState<"offers" | "recent">("offers");
  const shell = useOutletContext<{ openNavigation?: () => void } | undefined>();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const mounted = useRef(true);
  const locationRequest = useRef(0);
  const currentFilters = useRef({ radius, setFilter });
  useEffect(() => {
    currentFilters.current = { radius, setFilter };
  }, [radius, setFilter]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      locationRequest.current += 1;
    };
  }, []);
  const activity = useCommunityActivity();
  const offers = useMemo(
    () =>
      !radius
        ? loadedOffers
        : loadedOffers.filter((offer) => {
            const center = publicAreaCenter(offer.coarseArea);
            return center && distanceKm(place.center, center) <= radius;
          }),
    [loadedOffers, place, radius],
  );
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`discovery-offer-${selectedId}`)?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [selectedId]);
  const selected = offers.some((offer) => offer.id === selectedId)
    ? selectedId
    : null;
  const highlight = hoveredId ?? focusedId;
  const chooseOffer = (id: string) => setSelectedId(id);
  function clearFilters() {
    setPlace(DEFAULT_PLACE);
    setSelectedId(null);
    setLocationError("");
    locationRequest.current += 1;
    setLocating(false);
    onClear();
  }
  function selectPlace(next: MapPlace) {
    locationRequest.current += 1;
    setLocating(false);
    setPlace(next);
    setSelectedId(null);
    setLocationError("");
    setFilters({ q: "", radius: String(radius || 10), view: "map" });
  }
  function locate() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError(
        "Location is unavailable in this browser. Search for a city or area instead.",
      );
      return;
    }
    const request = ++locationRequest.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!mounted.current || request !== locationRequest.current) return;
        setLocating(false);
        if (
          !Number.isFinite(coords.latitude) ||
          !Number.isFinite(coords.longitude) ||
          coords.latitude < 4 ||
          coords.latitude > 22 ||
          coords.longitude < 116 ||
          coords.longitude > 127
        ) {
          setLocationError(
            "Explore currently covers the Philippines. Search for a Philippine city or area instead.",
          );
          return;
        }
        setPlace({
          id: "device-location",
          name: "Your location",
          context: "Used only for this search",
          center: [coords.longitude, coords.latitude],
        });
        setSelectedId(null);
        if (!currentFilters.current.radius)
          currentFilters.current.setFilter("radius", "10");
      },
      (error) => {
        if (!mounted.current || request !== locationRequest.current) return;
        setLocating(false);
        setLocationError(
          error.code === 1
            ? "Location permission was declined. Search for a city or area instead."
            : "Your location could not be found. Try again or search for a city.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  const resultSummary = `${offers.length} ${offers.length === 1 ? "offer" : "offers"} to explore`;
  const liveStatus =
    activity.status === "live"
      ? "Live updates connected"
      : activity.status === "paused"
        ? "Updates paused"
        : activity.status === "fallback"
          ? "Checking every minute"
          : "Connecting to updates…";
  const loadMore =
    hasNext && !pending && !error ? (
      <Button
        variant="outline"
        className="mx-auto my-4 flex"
        disabled={fetchingNext}
        onClick={loadNext}
      >
        {fetchingNext ? "Loading more offers…" : "Load more offers"}
      </Button>
    ) : null;
  const offerContent = pending ? (
    <Loading text="Finding community offers…" />
  ) : error ? (
    <ErrorNotice error={error} retry={retry} />
  ) : offers.length ? (
    <>
      {offers.map((offer) => {
        const center = publicAreaCenter(offer.coarseArea);
        if (view === "list")
          return <DiscoveryOfferCard key={offer.id} offer={offer} />;
        return (
          <DiscoveryOfferItem
            key={offer.id}
            offer={offer}
            selected={selected === offer.id}
            distance={
              radius && center ? distanceKm(place.center, center) : undefined
            }
            mapReady={mapReady}
            showMap={view === "map" ? () => chooseOffer(offer.id) : undefined}
            hover={(active) => setHoveredId(active ? offer.id : null)}
            focus={(active) => setFocusedId(active ? offer.id : null)}
          />
        );
      })}
      {loadMore}
    </>
  ) : (
    <div className="px-4">
      <Empty
        title="No offers match this view."
        action={
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      >
        {hasNext
          ? "No matching offers in the loaded posts. More posts are available to search."
          : "Try another area or return later."}
      </Empty>
      {loadMore}
    </div>
  );
  const recentContent = activity.error ? (
    <ErrorNotice error={activity.error} retry={() => void activity.refetch()} />
  ) : !activity.snapshot ? (
    <Loading text="Loading recent posts…" />
  ) : activity.snapshot.posts.length ? (
    <>
      <p className="px-4 pb-2 text-[10px] text-muted-foreground">
        Public posts across all areas, before your filters.
      </p>
      {activity.snapshot.posts.map((post) => (
        <article
          key={post.id}
          className="flex gap-2.5 border-b border-border px-4 py-3"
        >
          <MemberAvatar
            name={post.lender.display_name}
            avatarKey={post.lender.avatar_key}
            photoUrl={post.lender.photo_url}
            reputation={post.lender.reputation}
            size={34}
          />
          <div className="min-w-0">
            <strong className="text-xs">{post.lender.display_name}</strong>
            <Link
              className="my-1 flex items-start gap-2 text-[13px] font-bold text-foreground! hover:text-primary!"
              to={`/offers/${post.id}`}
            >
              <span className="line-clamp-2">{post.title}</span>
              <ArrowRight size={13} className="mt-1 shrink-0" />
            </Link>
            <small className="block text-[10px] text-muted-foreground">
              {post.area.name} ·{" "}
              <time dateTime={post.created_at}>{date(post.created_at)}</time>
            </small>
          </div>
        </article>
      ))}
    </>
  ) : (
    <Empty title="No recent offers yet">
      New public lending offers will appear here.
    </Empty>
  );
  if (view === "list")
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border bg-card">
          <div className="w-full">
            <ExploreControls
              layout="list"
              token={token}
              search={search}
              areas={areas}
              area={area}
              minimum={minimum}
              sort={sort}
              view={view}
              radius={radius}
              place={place}
              locationError={locationError}
              openNavigation={shell?.openNavigation}
              setFilter={setFilter}
              selectPlace={selectPlace}
              clearPlace={() => {
                locationRequest.current += 1;
                setLocating(false);
                setPlace(DEFAULT_PLACE);
                setSelectedId(null);
                setLocationError("");
                setFilter("radius", "");
              }}
            />
          </div>
          <DiscoverySuggestions
            areas={areas}
            area={area}
            minimum={minimum}
            sort={sort}
            setFilters={(values) => {
              setFeed("offers");
              setFilters(values);
            }}
          />
        </div>
        <section
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          aria-label="Lending offer list"
          tabIndex={0}
        >
          <div className="w-full px-4 py-6 sm:px-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">
                  {feed === "offers"
                    ? "Lending offers"
                    : "Recent community posts"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {feed === "offers"
                    ? resultSummary
                    : "Public posts across all areas"}{" "}
                  · {liveStatus}
                </p>
              </div>
              <Button
                variant="outline"
                aria-label={
                  feed === "offers"
                    ? "Show recent posts"
                    : "Show lending offers"
                }
                onClick={() => setFeed(feed === "offers" ? "recent" : "offers")}
              >
                {feed === "offers" ? (
                  <Newspaper size={16} />
                ) : (
                  <HandCoins size={16} />
                )}
                {feed === "offers" ? "Recent posts" : "Lending offers"}
              </Button>
            </div>
            {activity.hasUpdates && (
              <Button
                className="mb-4"
                variant="outline"
                disabled={activity.isFetching}
                onClick={() => void activity.applyUpdates()}
              >
                Show updated postings <RefreshCw size={14} />
              </Button>
            )}
            <div className="space-y-4">
              {feed === "offers" ? offerContent : recentContent}
            </div>
            {hasNext && feed === "offers" && (
              <p className="mt-4 text-xs text-muted-foreground">
                Matching loaded posts. Load more to extend your search.
              </p>
            )}
          </div>
        </section>
      </div>
    );
  return (
    <div className="relative grid h-full min-h-0 w-full flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
      {view === "map" && (
        <div className="relative col-start-1 row-start-2 h-[calc(100%_-_42dvh)] min-h-0 min-w-0 self-start lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-full [&_.discovery-map]:h-full [&_.discovery-map-state]:bg-muted! [&_.discovery-map-state_p]:text-muted-foreground! [&_.discovery-map-loading]:bg-muted! [&_.discovery-map-privacy]:bg-card! [&_.discovery-map-privacy]:text-muted-foreground!">
          <CommunityMap
            token={token}
            offers={offers}
            selectedId={selected}
            highlightedId={highlight}
            onSelect={chooseOffer}
            place={place}
            radiusKm={radius}
            locating={locating}
            onLocate={locate}
            onReadyChange={setMapReady}
          />
        </div>
      )}
      <aside aria-label="Community postings" className="contents">
        <div
          className={`relative z-20 col-start-1 row-start-1 min-w-0 border-b border-border bg-card lg:col-start-2 lg:border-l ${view === "list" ? "lg:row-span-2" : ""}`}
        >
          <ExploreControls
            token={token}
            search={search}
            areas={areas}
            area={area}
            minimum={minimum}
            sort={sort}
            view={view}
            radius={radius}
            place={place}
            locationError={locationError}
            openNavigation={shell?.openNavigation}
            setFilter={setFilter}
            selectPlace={selectPlace}
            clearPlace={() => {
              locationRequest.current += 1;
              setLocating(false);
              setPlace(DEFAULT_PLACE);
              setSelectedId(null);
              setLocationError("");
              setFilter("radius", "");
            }}
          />
        </div>
        <section
          aria-label={
            view === "list" ? "Lending offer list" : "Lending offer feed"
          }
          className={`relative z-10 col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col border-border bg-card ${view === "map" ? "h-[42dvh] max-h-full self-end border-t lg:col-start-2 lg:h-full lg:self-stretch lg:border-l lg:border-t-0" : "h-full lg:col-start-1 lg:row-span-2 lg:row-start-1"}`}
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-border px-3 py-1.5">
            <div className="min-w-0">
              <h2 className="text-xs font-bold" aria-live="polite">
                {feed === "offers" ? resultSummary : "Recent posts"}
              </h2>
              <span
                className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground"
                aria-label={liveStatus}
                title={liveStatus}
              >
                <Radio
                  size={10}
                  className={
                    activity.status === "live"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : ""
                  }
                />
                {activity.status === "live" ? "Live" : liveStatus}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {activity.status === "fallback" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11!"
                  aria-label="Reconnect live updates"
                  onClick={activity.reconnect}
                >
                  <RefreshCw size={13} />
                </Button>
              )}
              <Button
                variant="ghost"
                className="h-11! gap-1.5! px-2! text-xs"
                aria-label={
                  feed === "offers"
                    ? "Show recent posts"
                    : "Show lending offers"
                }
                onClick={() =>
                  setFeed((current) =>
                    current === "offers" ? "recent" : "offers",
                  )
                }
              >
                {feed === "offers" ? (
                  <Newspaper size={15} />
                ) : (
                  <HandCoins size={15} />
                )}
                {feed === "offers" ? "Recent posts" : "Lending offers"}
              </Button>
            </div>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            tabIndex={0}
            role="region"
            aria-label={
              feed === "offers"
                ? "Scrollable lending offers"
                : "Scrollable recent posts"
            }
          >
            {activity.hasUpdates && (
              <div
                className="m-3 rounded-xl bg-accent p-3 text-accent-foreground"
                role="status"
              >
                <p className="mb-2 text-xs">Updated postings are available.</p>
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={() => void activity.applyUpdates()}
                  disabled={activity.isFetching}
                >
                  Show updated postings <RefreshCw size={14} />
                </Button>
                {activity.error && (
                  <ErrorNotice
                    error={activity.error}
                    retry={() => void activity.applyUpdates()}
                  />
                )}
              </div>
            )}
            {feed === "offers" ? offerContent : recentContent}
            {hasNext && feed === "offers" && (
              <p className="px-4 pb-3 text-[10px] text-muted-foreground">
                Matching loaded posts. Load more to extend your search.
              </p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
