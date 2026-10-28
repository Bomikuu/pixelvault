import { OfferLikeButton } from "../engagement/OfferLikeButton";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@pixelvault/ui";
import { ArrowRight, MapPin, Radio, RefreshCw } from "lucide-react";
import {
  Empty,
  ErrorNotice,
  Loading,
  MemberAvatar,
  PersonName,
} from "../../components";
import { date, label, money } from "../../lib/format";
import { CommunityMap } from "./CommunityMap";
import { ExploreControls } from "./ExploreControls";
import {
  DEFAULT_PLACE,
  distanceKm,
  publicAreaCenter,
  type MapCommand,
} from "./geography";
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
  renderOffer: (offer: DiscoveryOffer) => ReactNode;
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
  renderOffer,
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
  const [command, setCommand] = useState<MapCommand | null>(null);
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
      <div className={view === "map" ? "discovery-postings" : "offer-list"}>
        {offers.map((offer) =>
          view === "map" ? (
            <article
              key={offer.id}
              id={`discovery-offer-${offer.id}`}
              onMouseEnter={() => setHoveredId(offer.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocusCapture={() => setFocusedId(offer.id)}
              onBlurCapture={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                )
                  setFocusedId(null);
              }}
              className={`discovery-posting transition-colors hover:bg-muted/60 focus-within:bg-muted/60 motion-reduce:transition-none ${selected === offer.id ? "is-selected" : ""}`}
            >
              <div className="discovery-posting-person">
                <PersonName
                  person={offer.lender}
                  subtitle={
                    radius && publicAreaCenter(offer.coarseArea)
                      ? `${offer.area} · ~${distanceKm(place.center, publicAreaCenter(offer.coarseArea)!).toFixed(1)} km`
                      : offer.area
                  }
                />
                <Button
                  variant={selected === offer.id ? "secondary" : "ghost"}
                  size="icon"
                  aria-label={`Show ${offer.title} on map`}
                  aria-pressed={selected === offer.id}
                  onClick={() => chooseOffer(offer.id)}
                  className="size-11!"
                  disabled={!mapReady || !offer.coarseArea?.approximate}
                >
                  <MapPin size={17} />
                </Button>
              </div>
              <Link
                to={`/offers/${offer.id}`}
                className="discovery-posting-title"
              >
                {offer.title}
                <ArrowRight size={15} />
              </Link>
              <div className="discovery-posting-money">
                <div>
                  <span>Available to lend</span>
                  <strong>{money(offer.available_amount)}</strong>
                </div>
                <div>
                  <span>Annual interest</span>
                  <strong>{(offer.annual_rate_bps / 100).toFixed(2)}%</strong>
                </div>
              </div>
              <p className="discovery-posting-plan">
                {offer.installment_count} {label(offer.frequency).toLowerCase()}{" "}
                payments · reducing balance
              </p>
              <div className="discovery-posting-cost">
                <span>Cost example</span>
                <strong>
                  {money(offer.disclosure.principal)} →{" "}
                  {money(offer.disclosure.total_repayment)}
                </strong>
                <small>Principal → total repayment</small>
              </div>
              <OfferLikeButton offerId={offer.id} initial={offer.likes} />
              <div className="discovery-posting-bottom">
                {offer.created_at && (
                  <time dateTime={offer.created_at}>
                    {date(offer.created_at)}
                  </time>
                )}
                <Link to={`/offers/${offer.id}`}>Full terms & schedule</Link>
              </div>
            </article>
          ) : (
            <div key={offer.id}>{renderOffer(offer)}</div>
          ),
        )}
      </div>
      {loadMore}
    </>
  ) : (
    <>
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
          : "Try another area or return later. An offer is a lending intention, not preapproved credit."}
      </Empty>
      {loadMore}
    </>
  );
  return (
    <div className="min-w-0 [&_.discovery-posting]:border-border! [&_.discovery-posting-title]:text-foreground! [&_.person_small]:text-muted-foreground! [&_.discovery-posting-money_span]:text-muted-foreground! [&_.discovery-posting-plan]:text-muted-foreground! [&_.discovery-posting-cost]:bg-muted! [&_.discovery-posting-cost_span]:text-muted-foreground! [&_.discovery-posting-cost_small]:text-muted-foreground! [&_.discovery-posting-bottom]:text-muted-foreground! [&_.discovery-posting-bottom>a]:text-primary! [&_.discovery-posting.is-selected]:bg-accent!">
      <div
        className={`grid min-w-0 grid-cols-1 lg:items-start lg:gap-0 ${view === "map" ? "lg:h-[max(640px,calc(100dvh-180px))] lg:max-h-[960px] lg:grid-cols-[minmax(0,1fr)_minmax(340px,390px)] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border" : "gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,390px)] lg:gap-5"}`}
      >
        {view === "map" ? (
          <div className="order-2 h-[360px] min-w-0 overflow-hidden border-x border-border lg:order-1 lg:h-full lg:border-0 [&_.discovery-map]:h-full [&_.discovery-map-state]:bg-muted! [&_.discovery-map-state_p]:text-muted-foreground! [&_.discovery-map-loading]:bg-muted! [&_.discovery-map-privacy]:bg-card! [&_.discovery-map-privacy]:text-muted-foreground!">
            <CommunityMap
              token={token}
              offers={offers}
              selectedId={selected}
              highlightedId={highlight}
              onSelect={chooseOffer}
              place={place}
              radiusKm={radius}
              command={command}
              onReadyChange={setMapReady}
            />
          </div>
        ) : (
          <section
            className="order-2 min-w-0 rounded-2xl border border-border bg-card p-4 lg:order-1 lg:p-5"
            aria-label="Lending offer list"
          >
            <div className="mb-4">
              <h2 className="text-sm font-bold" aria-live="polite">
                {resultSummary}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasNext
                  ? "Matching loaded posts. Load more to extend your search."
                  : "Private applications. Individual decisions."}
              </p>
            </div>
            {offerContent}
          </section>
        )}
        <aside
          aria-label="Community postings"
          className={`contents min-w-0 bg-card lg:order-2 lg:flex lg:flex-col ${view === "map" ? "lg:h-full lg:min-h-0 lg:border-l lg:border-border" : "lg:rounded-2xl lg:border lg:border-border"}`}
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
            mapReady={mapReady}
            locating={locating}
            locationError={locationError}
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
            locate={locate}
            command={(type) =>
              setCommand((previous) => ({
                type,
                sequence: (previous?.sequence ?? 0) + 1,
              }))
            }
          />
          <div
            className={`order-3 min-h-0 rounded-b-2xl border border-t-0 border-border bg-card lg:rounded-none lg:border-0 ${view === "map" ? "lg:flex lg:flex-1 lg:flex-col lg:overflow-hidden" : "px-4 pb-4"}`}
          >
            <div className="flex min-h-9 items-center justify-between gap-2 px-4 py-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Radio
                  size={12}
                  className={
                    activity.status === "live"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : ""
                  }
                />
                {activity.status === "live"
                  ? "Live updates connected"
                  : activity.status === "paused"
                    ? "Updates paused"
                    : activity.status === "fallback"
                      ? "Checking every minute"
                      : "Connecting to updates…"}
              </span>
              {activity.status === "fallback" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9! min-h-9!"
                  aria-label="Reconnect live updates"
                  onClick={activity.reconnect}
                >
                  <RefreshCw size={13} />
                </Button>
              )}
            </div>
            {activity.hasUpdates && (
              <div
                className="mx-4 mb-3 rounded-xl bg-accent p-3 text-accent-foreground"
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
            {view === "map" && (
              <Tabs
                defaultValue="offers"
                className="flex min-h-0 flex-1 flex-col gap-0"
              >
                <TabsList className="mx-4 mb-3 grid h-11! w-auto! shrink-0 grid-cols-2">
                  <TabsTrigger value="offers">Lending offers</TabsTrigger>
                  <TabsTrigger value="recent">Recent posts</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="offers"
                  className="min-h-0 overflow-y-auto px-4 pb-4"
                >
                  <div className="pb-3">
                    <h2 className="text-sm font-bold" aria-live="polite">
                      {resultSummary}
                    </h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {hasNext
                        ? "Matching loaded posts. Load more to extend your search."
                        : "Individual lenders decide privately."}
                    </p>
                  </div>
                  {offerContent}
                </TabsContent>
                <TabsContent
                  value="recent"
                  className="min-h-0 overflow-y-auto px-4 pb-4"
                >
                  <h2 className="mb-3 text-sm font-bold">
                    Recent community posts
                  </h2>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Public posts across all areas, before your filters.
                  </p>
                  {activity.error ? (
                    <ErrorNotice
                      error={activity.error}
                      retry={() => void activity.refetch()}
                    />
                  ) : !activity.snapshot ? (
                    <Loading text="Loading recent posts…" />
                  ) : activity.snapshot.posts.length ? (
                    <div>
                      {activity.snapshot.posts.map((post) => (
                        <article
                          key={post.id}
                          className="flex gap-3 border-t border-border py-4"
                        >
                          <MemberAvatar
                            name={post.lender.display_name}
                            avatarKey={post.lender.avatar_key}
                            photoUrl={post.lender.photo_url}
                            reputation={post.lender.reputation}
                            size={40}
                          />
                          <div className="min-w-0">
                            <strong className="text-xs">
                              {post.lender.display_name}
                            </strong>
                            <Link
                              className="my-1 flex items-start gap-2 text-sm font-bold text-primary hover:underline"
                              to={`/offers/${post.id}`}
                            >
                              {post.title}
                              <ArrowRight size={13} className="mt-1 shrink-0" />
                            </Link>
                            <small className="block text-[10px] text-muted-foreground">
                              {post.area.name} ·{" "}
                              <time dateTime={post.created_at}>
                                {date(post.created_at)}
                              </time>
                            </small>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty title="No recent offers yet">
                      New public lending offers will appear here.
                    </Empty>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </aside>
      </div>
      <p className="mt-3 max-w-[90ch] text-[11px] leading-relaxed text-muted-foreground">
        Rates alone do not show total cost. Open an offer for principal,
        interest, fees and exact dates. Public map markers use approximate area
        centers.
      </p>
    </div>
  );
}
