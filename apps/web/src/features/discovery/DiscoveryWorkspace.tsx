import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@pixelvault/ui";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  List,
  Map as MapIcon,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  ActionLink,
  Empty,
  ErrorNotice,
  IllustratedInfoDialog,
  Loading,
  MemberAvatar,
  PersonName,
} from "../../components";
import { date, label, money } from "../../lib/format";
import { CommunityMap } from "./CommunityMap";
import { PlaceSearch } from "./PlaceSearch";
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
  setFilter: (key: string, value: string) => void;
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
  offers,
  areas,
  search,
  area,
  sort,
  minimum,
  view,
  setFilter,
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
  const [place, setPlace] = useState<MapPlace | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const activity = useCommunityActivity();
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
  const chooseOffer = (id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
  };
  const resultSummary = `${offers.length} ${offers.length === 1 ? "offer" : "offers"} to explore`;
  const loadMore =
    hasNext && !pending && !error ? (
      <Button
        variant="outline"
        className="discovery-load-more"
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
              className={`discovery-posting ${selected === offer.id ? "is-selected" : ""}`}
            >
              <div className="discovery-posting-person">
                <PersonName person={offer.lender} subtitle={offer.area} />
                <Button
                  variant={selected === offer.id ? "secondary" : "ghost"}
                  size="icon"
                  aria-label={`Show ${offer.title} on map`}
                  aria-pressed={selected === offer.id}
                  onClick={() => chooseOffer(offer.id)}
                  disabled={!offer.coarseArea?.approximate}
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
          <Button variant="outline" onClick={onClear}>
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
    <div className="discovery-surface">
      <header className="discovery-heading">
        <div>
          <h1>Meet your lending community.</h1>
          <p>People nearby. Clear terms. A private next step.</p>
        </div>
        <div>
          <IllustratedInfoDialog
            title="Nearby, with boundaries."
            description="Explore public lending intentions by approximate area. Review the complete terms before applying."
            scene="finding-your-way"
            triggerLabel="How discovery works"
          >
            <p>
              Markers group public city or area centers. They never show
              anyone’s home. A listing is an intention to lend, not approved
              credit or guaranteed funding.
            </p>
          </IllustratedInfoDialog>
          <ActionLink to="/offers/new">
            <Plus size={17} />
            Post an offer
          </ActionLink>
        </div>
      </header>
      <div className="discovery-toolbar">
        <PlaceSearch
          token={token}
          onSelect={(next) => {
            setPlace(next);
            setFilter("view", "map");
          }}
        />
        <div className="discovery-lender-search">
          <Search size={17} />
          <Input
            aria-label="Search lending offers"
            value={search}
            onChange={(event) => setFilter("q", event.target.value)}
            placeholder="Lender or offer"
          />
        </div>
        <div className="discovery-view-switch" aria-label="Discovery view">
          <Button
            variant={view === "map" ? "secondary" : "ghost"}
            aria-pressed={view === "map"}
            onClick={() => setFilter("view", "map")}
          >
            <MapIcon size={16} />
            Map
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            aria-pressed={view === "list"}
            onClick={() => setFilter("view", "list")}
          >
            <List size={16} />
            List
          </Button>
        </div>
      </div>
      <div className="discovery-filter-bar">
        <Select
          value={area}
          onValueChange={(value) => setFilter("area", value)}
        >
          <SelectTrigger aria-label="Filter by approximate area">
            <MapPin size={14} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            {areas.map((name) => (
              <SelectItem value={name} key={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="discovery-amount">
          <Label htmlFor="discovery-minimum">Minimum available ₱</Label>
          <Input
            id="discovery-minimum"
            type="number"
            min={0}
            value={minimum}
            placeholder="Any"
            onChange={(event) => setFilter("amount", event.target.value)}
          />
        </div>
        <Select
          value={sort}
          onValueChange={(value) => setFilter("sort", value)}
        >
          <SelectTrigger aria-label="Sort offers">
            <ArrowDownWideNarrow size={14} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently listed</SelectItem>
            <SelectItem value="amount">Available amount</SelectItem>
            <SelectItem value="rate">Annual interest</SelectItem>
          </SelectContent>
        </Select>
        <div className={`discovery-live-status is-${activity.status}`}>
          <Radio size={14} />
          <span>
            {activity.status === "live"
              ? "Live updates connected"
              : activity.status === "paused"
                ? "Updates paused while this tab is hidden"
                : activity.status === "fallback"
                  ? "Live connection unavailable · checking every minute"
                  : "Connecting to community updates…"}
          </span>
          {activity.status === "fallback" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Reconnect live updates"
              onClick={activity.reconnect}
            >
              <RefreshCw size={13} />
            </Button>
          )}
        </div>
      </div>
      {activity.hasUpdates && (
        <div className="discovery-update-banner" role="status">
          <span>Updated postings are available.</span>
          <Button
            variant="outline"
            onClick={() => void activity.applyUpdates()}
            disabled={activity.isFetching}
          >
            Show updated postings <RefreshCw size={14} />
          </Button>
        </div>
      )}
      {activity.hasUpdates && activity.error && (
        <ErrorNotice
          error={activity.error}
          retry={() => void activity.applyUpdates()}
        />
      )}
      {place && (
        <p className="discovery-place-caption">
          Map centered on {place.name}. Offer filters stay unchanged.
        </p>
      )}
      {view === "map" ? (
        <div
          className={`discovery-workspace ${panelOpen ? "panel-open" : "panel-collapsed"}`}
        >
          <CommunityMap
            token={token}
            offers={offers}
            selectedId={selected}
            onSelect={chooseOffer}
            place={place}
          />
          <aside
            className="discovery-posting-panel"
            aria-label="Community postings"
          >
            <Button
              className="discovery-sheet-toggle"
              variant="ghost"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen((open) => !open)}
            >
              <span>{resultSummary}</span>
              {panelOpen ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
            </Button>
            <Tabs defaultValue="offers" className="discovery-posting-tabs">
              <TabsList>
                <TabsTrigger value="offers">Lending offers</TabsTrigger>
                <TabsTrigger value="recent">Recent posts</TabsTrigger>
              </TabsList>
              <TabsContent value="offers">
                <div className="discovery-results-heading">
                  <strong>{resultSummary}</strong>
                  <small>Individual lenders decide privately.</small>
                </div>
                {offerContent}
              </TabsContent>
              <TabsContent value="recent">
                <div className="discovery-results-heading">
                  <strong>Recent community posts</strong>
                  <small>Public offers, in posting order.</small>
                </div>
                {activity.error ? (
                  <ErrorNotice
                    error={activity.error}
                    retry={() => void activity.refetch()}
                  />
                ) : !activity.snapshot ? (
                  <Loading text="Loading recent posts…" />
                ) : activity.snapshot.posts.length ? (
                  <div className="discovery-recent-posts">
                    {activity.snapshot.posts.map((post) => (
                      <article key={post.id}>
                        <MemberAvatar
                          name={post.lender.display_name}
                          avatarKey={post.lender.avatar_key}
                          photoUrl={post.lender.photo_url}
                          reputation={post.lender.reputation}
                          size={40}
                        />
                        <div>
                          <strong>{post.lender.display_name}</strong>
                          <Link to={`/offers/${post.id}`}>
                            {post.title}
                            <ArrowRight size={13} />
                          </Link>
                          <small>
                            <MapPin size={12} />
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
          </aside>
        </div>
      ) : (
        <section
          className="discovery-list-workspace"
          aria-label="Lending offer list"
        >
          <div className="discovery-results-heading">
            <strong>{resultSummary}</strong>
            <small>Private applications. Individual decisions.</small>
          </div>
          {offerContent}
        </section>
      )}
      <p className="discovery-footnote">
        Rates alone do not show total cost. Open an offer for principal,
        interest, fees and exact dates. Public map markers use approximate area
        centers.
      </p>
    </div>
  );
}
