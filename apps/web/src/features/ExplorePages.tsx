import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Filter,
  HandCoins,
  List,
  Map,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  Button,
  Input,
  Badge,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@pixelvault/ui";
import type {
  Application,
  Offer,
  Installment,
  Money,
} from "@pixelvault/contracts";
import { apiRequest, items, operationId, post } from "../app/api";
import { useSession } from "../app/session";
import {
  ActionLink,
  ContextIllustration,
  ApiForm,
  CheckField,
  DefinitionList,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  PageHeading,
  PersonName,
  SelectField,
  Status,
  TextField,
  VerifiedNote,
} from "../components";
import { cents, date, label, money, text } from "../lib/format";
interface DiscoveryPage {
  offers: {
    id: string;
    title: string;
    lender: { handle: string; display_name: string; avatar_key?: string };
    area: { name: string };
    declared_available_amount: string;
    min_amount: string;
    max_amount: string;
    terms: Offer["terms"];
    cost_example: Offer["disclosure"];
  }[];
  next_cursor: string | null;
}
export function useOffers() {
  const query = useInfiniteQuery({
    queryKey: ["offers"],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiRequest<DiscoveryPage>(
        `/community/discovery${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (last) => last.next_cursor || undefined,
  });
  return {
    ...query,
    data: query.data?.pages.flatMap((page) =>
      page.offers.map(
        (row) =>
          ({
            id: row.id,
            title: row.title,
            lender: {
              id: row.lender.handle,
              handle: row.lender.handle,
              display_name: row.lender.display_name,
              avatar_key: row.lender.avatar_key,
            },
            area: row.area.name,
            declared_amount: row.declared_available_amount,
            available_amount: row.declared_available_amount,
            annual_rate_bps: row.terms.annual_rate_bps,
            frequency: row.terms.frequency,
            installment_count: row.terms.installment_count,
            min_amount: row.min_amount,
            max_amount: row.max_amount,
            status: "published",
            terms: row.terms,
            disclosure: row.cost_example,
          }) satisfies Offer,
      ),
    ),
  };
}
export function OfferRow({ offer }: { offer: Offer }) {
  return (
    <article className="offer-row">
      <div className="offer-person">
        <PersonName
          person={offer.lender}
          subtitle={offer.area || "Area not specified"}
        />
        <Status value={offer.status} />
      </div>
      <Link to={`/offers/${offer.id}`} className="offer-title">
        {offer.title}
        <ArrowUpRightIcon />
      </Link>
      <div className="offer-terms">
        <div>
          <span>Available to lend</span>
          <strong>{money(offer.available_amount)}</strong>
        </div>
        <div>
          <span>Annual interest</span>
          <strong>
            {(offer.annual_rate_bps / 100).toFixed(2)}%{" "}
            <small>reducing balance</small>
          </strong>
        </div>
        <div>
          <span>Payment plan</span>
          <strong>
            {offer.installment_count} {label(offer.frequency).toLowerCase()}{" "}
            payments
          </strong>
        </div>
      </div>
      <div className="offer-cost-example">
        <span>Cost example</span>
        <strong>
          {money(offer.disclosure.principal)} →{" "}
          {money(offer.disclosure.total_repayment)}
        </strong>
        <small>Principal → total repayment · exact dates in full terms</small>
      </div>
      <div className="offer-bottom">
        <span>
          <MapPin size={14} />
          {offer.area || "Area not specified"} · approximate area
        </span>
        <Link to={`/offers/${offer.id}`}>
          View terms & schedule <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M6 18 18 6M6 6h12v12" />
    </svg>
  );
}
export function ExplorePage() {
  const query = useOffers(),
    [params, setParams] = useSearchParams();
  const search = params.get("q") || "",
    area = params.get("area") || "all",
    view = params.get("view") || "list",
    sort = params.get("sort") || "recent";
  const areas = [
    ...new Set((query.data || []).map((o) => o.area).filter(Boolean)),
  ];
  const offers = useMemo(() => {
    const result = (query.data || []).filter(
      (o) =>
        `${o.title} ${o.lender.display_name}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (area === "all" || o.area === area) &&
        (!params.get("amount") ||
          Number(o.available_amount) >= Number(params.get("amount")) * 100),
    );
    if (sort === "amount")
      result.sort(
        (a, b) => Number(b.available_amount) - Number(a.available_amount),
      );
    if (sort === "rate")
      result.sort((a, b) => a.annual_rate_bps - b.annual_rate_bps);
    return result;
  }, [query.data, search, area, sort, params]);
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    value && value !== "all" ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  }
  return (
    <>
      <PageHeading
        title="Good things start with community."
        description="Find individual lenders. Compare clear terms. Take the next step privately."
        action={
          <ActionLink to="/offers/new">
            <Plus size={17} />
            Post an offer
          </ActionLink>
        }
      />
      <div className="explore-layout">
        <div>
          <div className="explore-toolbar">
            <div className="search-box">
              <Search size={18} />
              <Input
                aria-label="Search lending offers"
                value={search}
                onChange={(e) => set("q", e.target.value)}
                placeholder="Search lenders or offers"
              />
            </div>
            <div className="view-switch" aria-label="Discovery view">
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                onClick={() => set("view", "list")}
                aria-pressed={view === "list"}
              >
                <List size={17} />
                List
              </Button>
              <Button
                variant={view === "map" ? "secondary" : "ghost"}
                onClick={() => set("view", "map")}
                aria-pressed={view === "map"}
              >
                <Map size={17} />
                Map
              </Button>
            </div>
          </div>
          <div className="filter-line">
            <MapPin size={16} />
            <Select value={area} onValueChange={(value) => set("area", value)}>
              <SelectTrigger
                aria-label="Filter by approximate area"
                className="area-filter"
              >
                <SelectValue placeholder="All areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                {areas.map((a) => (
                  <SelectItem value={a} key={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="filter-amount">
              <Label htmlFor="filter-amount">Minimum available ₱</Label>
              <Input
                id="filter-amount"
                type="number"
                min={0}
                value={params.get("amount") || ""}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="Any"
              />
            </div>
            <Select value={sort} onValueChange={(value) => set("sort", value)}>
              <SelectTrigger className="sort-filter" aria-label="Sort offers">
                <ArrowDownWideNarrow size={14} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently listed</SelectItem>
                <SelectItem value="amount">Available amount</SelectItem>
                <SelectItem value="rate">Annual interest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {query.isPending ? (
            <Loading text="Finding community offers…" />
          ) : query.error ? (
            <ErrorNotice error={query.error} retry={() => query.refetch()} />
          ) : (
            <>
              <div className="results-label">
                <strong>
                  {offers.length} {offers.length === 1 ? "offer" : "offers"} to
                  explore
                </strong>
                <span>Private applications. Individual decisions.</span>
              </div>
              {view === "map" && (
                <div className="map-panel">
                  <div className="map-graphic" aria-hidden="true">
                    <svg viewBox="0 0 600 240">
                      <path d="M0 60H600M0 120H600M0 180H600M100 0V240M200 0V240M300 0V240M400 0V240M500 0V240" />
                      <path
                        d="m0 210 150-60 120 15 125-85 206-35"
                        className="map-waterway"
                      />
                      {[...new Set(offers.map((o) => o.area))].map((a, i) => (
                        <g
                          key={a}
                          transform={`translate(${110 + (i % 4) * 125},${65 + Math.floor(i / 4) * 80})`}
                        >
                          <circle r="20" />
                          <text y="5" textAnchor="middle">
                            {offers.filter((o) => o.area === a).length}
                          </text>
                          <text
                            y="40"
                            textAnchor="middle"
                            className="map-label"
                          >
                            {a.slice(0, 18)}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                  <div className="map-caption">
                    <MapPin size={16} />
                    <div>
                      <strong>Area overview</strong>
                      <p>
                        Schematic grouping by area, not street locations. A
                        geographic tile provider has not been configured. The
                        complete list is below.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {!offers.length ? (
                <Empty
                  title="A new connection is still ahead."
                  icon={Users}
                  action={
                    <Button variant="outline" onClick={() => setParams({})}>
                      Clear filters
                    </Button>
                  }
                >
                  There are no available offers matching these filters. Try
                  another area or return later.
                </Empty>
              ) : (
                <div className="offer-list">
                  {offers.map((offer) => (
                    <OfferRow key={offer.id} offer={offer} />
                  ))}
                </div>
              )}
              {query.hasNextPage && (
                <Button
                  className="load-more"
                  variant="outline"
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage
                    ? "Loading more offers…"
                    : "Load more offers"}
                </Button>
              )}
              <p className="cost-note">
                Rates alone do not show total cost. Open an offer to review the
                principal, interest, fees and exact schedule before applying.
              </p>
            </>
          )}
        </div>
        <aside className="community-aside">
          <div className="community-note">
            <ContextIllustration
              scene="community-workshop"
              className="community-scene"
              eager
            />
            <h2>
              People first.
              <br />
              Clear terms, always.
            </h2>
            <p>
              A lending community built around informed choices and a shared
              agreement.
            </p>
            <div className="community-values">
              <span>
                <ShieldCheck size={17} />
                Specific verification checks
              </span>
              <span>
                <FileIcon />A contract for every loan
              </span>
              <span>
                <Users size={17} />
                Private applications
              </span>
            </div>
            <Link to="/learn">
              How lending works <ArrowRight size={15} />
            </Link>
          </div>
          <div className="aside-section">
            <h3>Your next chapter</h3>
            <p>
              Understand repayment schedules and your responsibilities before
              you commit.
            </p>
            <Link to="/learn" className="text-link">
              <span>Visit the learning room</span>
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="privacy-note">
            <MapPin size={18} />
            <p>
              Nearby, with boundaries. Profiles show an approximate area, never
              a home address.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function FileIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </svg>
  );
}
export function Schedule({ rows }: { rows: Installment[] }) {
  return (
    <div className="schedule-list">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payment</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead className="text-right">Principal</TableHead>
            <TableHead className="text-right">Interest</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id || index}>
              <TableCell>#{row.sequence || index + 1}</TableCell>
              <TableCell>{date(row.due_date)}</TableCell>
              <TableCell className="text-right money">
                {money(row.principal)}
              </TableCell>
              <TableCell className="text-right money">
                {money(row.interest)}
              </TableCell>
              <TableCell className="text-right money font-bold">
                {money(row.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
export function CostDisclosure({
  offer,
  disclosure = offer?.disclosure,
}: {
  offer?: Offer;
  disclosure?: Record<string, unknown>;
}) {
  const d = disclosure || {};
  const borrowerFees = Array.isArray(d.borrower_fees)
    ? (d.borrower_fees as { code: string; amount: Money; timing: string }[])
    : [];
  const lenderFees = Array.isArray(d.lender_fees)
    ? (d.lender_fees as { code: string; amount: Money; timing: string }[])
    : [];
  return (
    <DefinitionList
      rows={[
        ["Principal", money((d.principal as Money) || offer?.terms?.principal)],
        ["Net amount received", money(d.net_proceeds as Money)],
        ["Total interest", money(d.total_interest as Money)],
        ["Total repayment", money(d.total_repayment as Money)],
        [
          "Effective annual interest",
          d.effective_annual_percentage !== undefined
            ? `${d.effective_annual_percentage}%`
            : "—",
        ],
        ...borrowerFees.map(
          (fee) =>
            [
              `${label(fee.code)} · borrower · ${label(fee.timing)}`,
              money(fee.amount),
            ] as [string, string],
        ),
        ...lenderFees.map(
          (fee) =>
            [
              `${label(fee.code)} · lender · ${label(fee.timing)}`,
              money(fee.amount),
            ] as [string, string],
        ),
        ["Platform commission on repayments", money(0)],
        ["Late charge under these terms", money(d.late_fee as Money)],
        ["Time zone", "Asia/Manila"],
      ]}
    />
  );
}
export function OfferDetail() {
  const { id } = useParams();
  const { session } = useSession();
  const query = useQuery({
    queryKey: ["offer", id],
    queryFn: () => apiRequest<Offer>(`/offers/${id}`),
    enabled: !!session?.member,
  });
  if (!session?.member)
    return (
      <Empty
        title="Keep the next step private."
        action={
          <ActionLink to="/sign-in">Sign in to review full terms</ActionLink>
        }
      >
        Community offers are available to browse. Sign in to view the full offer
        and begin a private application.
      </Empty>
    );
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const offer = query.data;
  const owned = session?.member?.id === offer.lender.id;
  return (
    <>
      <Link className="back-link" to="/explore">
        <ArrowLeft size={16} />
        Explore offers
      </Link>
      <PageHeading
        title={offer.title}
        description="Review the full terms before starting a private application."
        action={<Status value={offer.status} />}
      />
      <div className="detail-layout">
        <section className="surface">
          <PersonName person={offer.lender} subtitle={offer.area} />
          <div className="offer-detail-amount">
            <span>Self-declared amount available to lend</span>
            <strong>{money(offer.available_amount)}</strong>
          </div>
          <DefinitionList
            rows={[
              [
                "Annual reducing-balance interest",
                `${(offer.annual_rate_bps / 100).toFixed(2)}%`,
              ],
              ["Payment frequency", label(offer.frequency)],
              ["Number of installments", offer.installment_count],
              [
                "Permitted request",
                `${money(offer.min_amount)} – ${money(offer.max_amount)}`,
              ],
            ]}
          />
          <h2>Full cost example</h2>
          <CostDisclosure offer={offer} />
          <h2>Repayment schedule</h2>
          {offer.disclosure.schedule?.length ? (
            <Schedule rows={offer.disclosure.schedule} />
          ) : (
            <Notice>
              The final schedule is generated from your requested amount and
              accepted terms.
            </Notice>
          )}
          <VerifiedNote />
        </section>
        <aside>
          <div className="surface sticky-summary">
            <h2>A private next step.</h2>
            <p>
              The lender reviews applications and chooses. You both accept the
              exact agreement before funding.
            </p>
            {owned ? (
              <>
                <Notice>
                  You posted this offer. Review applications in your private
                  workspace.
                </Notice>
                {offer.status === "draft" && (
                  <ApiForm
                    onSubmit={(data) =>
                      post(`/offers/${id}/publish`, {
                        operation_id: text(data, "operation_id"),
                      })
                    }
                    submitLabel="Publish test offer"
                    successMessage="Offer published in the test community."
                  >
                    {null}
                  </ApiForm>
                )}
                <ActionLink to="/applications" variant="outline">
                  Review applications
                </ActionLink>
              </>
            ) : (
              <ActionLink to={`/applications/new?offer=${id}`}>
                <HandCoins size={17} />
                Request to borrow
              </ActionLink>
            )}
            <p className="small-text">
              Applying does not create a loan. No public borrower bidding, and
              no fee simply for applying.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
export function NewOffer() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeading
        title="Make room for someone’s tomorrow."
        description="Post a lending intention with clear, comparable terms. It is not money held by PixelVault."
      />
      <div className="form-layout">
        <section className="surface">
          <ApiForm
            submitLabel="Create test offer"
            onSubmit={(data) =>
              post<Offer>("/offers", {
                title: text(data, "title"),
                area: text(data, "area"),
                declared_amount: cents(data.get("declared_amount")),
                principal: cents(data.get("principal")),
                min_amount: cents(data.get("min_amount")),
                max_amount: cents(data.get("max_amount")),
                annual_rate_bps: Math.round(
                  Number(data.get("annual_rate")) * 100,
                ),
                frequency: text(data, "frequency"),
                installment_count: Number(data.get("installment_count")),
                effective_date: text(data, "effective_date"),
                operation_id: text(data, "operation_id"),
              })
            }
            onSuccess={(data) => navigate(`/offers/${(data as Offer).id}`)}
          >
            <Field
              name="title"
              label="Offer title"
              required
              placeholder="For a meaningful next step"
            />
            <div className="form-grid">
              <Field
                name="area"
                label="Approximate city or municipality"
                required
                placeholder="Quezon City"
              />
              <Field
                name="declared_amount"
                label="Amount available to lend (₱)"
                type="number"
                min={1}
                step="0.01"
                required
              />
              <Field
                name="min_amount"
                label="Minimum request (₱)"
                type="number"
                min={1}
                step="0.01"
                required
              />
              <Field
                name="max_amount"
                label="Maximum request (₱)"
                type="number"
                min={1}
                step="0.01"
                required
              />
              <Field
                name="principal"
                label="Cost example principal (₱)"
                type="number"
                min={1}
                step="0.01"
                required
              />
              <Field
                name="annual_rate"
                label="Annual interest (%)"
                type="number"
                min={0}
                max={100}
                step="0.01"
                required
              />
              <SelectField
                name="frequency"
                label="Payment frequency"
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "twice_monthly", label: "Twice monthly" },
                  { value: "weekly", label: "Weekly" },
                ]}
              />
              <Field
                name="installment_count"
                label="Number of payments"
                type="number"
                min={1}
                max={52}
                required
              />
              <Field
                name="effective_date"
                label="Proposed effective date"
                type="date"
                required
              />
            </div>
            <CheckField name="acknowledge" required>
              I understand that eligibility review is separate from identity
              verification and this is a test offer.
            </CheckField>
          </ApiForm>
        </section>
        <aside className="form-aside">
          <h2>One person. Clear terms.</h2>
          <p>
            You choose an applicant. Both parties review the full cost and
            accept the agreement.
          </p>
          <Notice tone="warning">
            Live origination remains disabled. Formal lender registration and
            legal/provider approvals are separate requirements.
          </Notice>
          <Link to="/lender-registration">
            Review lender registration <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </>
  );
}
export function ApplyPage() {
  const [params] = useSearchParams();
  const offerId = params.get("offer");
  const query = useQuery({
    queryKey: ["offer", offerId],
    queryFn: () => apiRequest<Offer>(`/offers/${offerId}`),
    enabled: !!offerId,
  });
  const navigate = useNavigate();
  if (!offerId)
    return (
      <Empty
        title="Choose an offer first"
        action={<ActionLink to="/explore">Explore offers</ActionLink>}
      />
    );
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  return (
    <>
      <PageHeading
        title="Your request, kept private."
        description={`Apply to ${query.data.lender.display_name}. Only the relevant parties and authorized reviewers can see your application.`}
      />
      <div className="form-layout">
        <section className="surface">
          <ApiForm
            submitLabel="Send private application"
            onSubmit={(data) =>
              post<Application>(`/offers/${offerId}/applications`, {
                principal: cents(data.get("principal")),
                purpose: text(data, "purpose"),
                summary: {
                  employment_type: text(data, "employment_type"),
                  income_band: text(data, "income_band"),
                  repayment_experience: text(data, "summary"),
                },
                operation_id: text(data, "operation_id"),
              })
            }
            onSuccess={(data) =>
              navigate(`/applications/${(data as Application).id}`)
            }
          >
            <Field
              name="principal"
              label="Requested principal (₱)"
              type="number"
              step="0.01"
              min={Number(query.data.min_amount) / 100}
              max={Number(query.data.max_amount) / 100}
              required
            />
            <TextField
              name="purpose"
              label="What will this help you do?"
              maxLength={500}
              required
              help="Share only what is necessary. Your financial need is never posted publicly."
            />
            <SelectField
              name="employment_type"
              label="Income source"
              options={[
                { value: "employed", label: "Employed" },
                { value: "freelancer", label: "Freelancer" },
                { value: "self_employed", label: "Self-employed" },
                { value: "other", label: "Other documented income" },
              ]}
            />
            <SelectField
              name="income_band"
              label="Monthly income range"
              options={[
                { value: "under_15000", label: "Under ₱15,000" },
                { value: "15000_30000", label: "₱15,000–₱30,000" },
                { value: "30000_60000", label: "₱30,000–₱60,000" },
                { value: "over_60000", label: "Above ₱60,000" },
              ]}
            />
            <TextField
              name="summary"
              maxLength={200}
              label="Repayment plan and relevant context"
              required
              help="Explain how the proposed schedule fits your income. Do not include ID numbers or banking credentials."
            />
            <CheckField name="terms" required>
              I have reviewed the offer’s rate and payment frequency. I will
              review the exact agreement before accepting any loan.
            </CheckField>
          </ApiForm>
        </section>
        <aside className="surface">
          <h2>{query.data.title}</h2>
          <CostDisclosure offer={query.data} />
          <Notice>
            No fee is earned merely because you apply. Applying does not
            guarantee selection.
          </Notice>
        </aside>
      </div>
    </>
  );
}
