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
  Person,
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
import { DiscoveryWorkspace } from "./discovery/DiscoveryWorkspace";
import { OfferCalculator } from "./engagement/OfferCalculator";
import { OfferSocial } from "./engagement/OfferSocial";
import { CoBorrowerApplicationField } from "./connections/CoBorrowerApplicationField";
import type { CoarseArea, DiscoveryOffer } from "./discovery/types";
interface DiscoveryPage {
  offers: {
    id: string;
    title: string;
    lender: Person & { handle: string };
    area: CoarseArea;
    created_at?: string;
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
    refetchOnWindowFocus: false,
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
              photo_url: row.lender.photo_url,
              reputation: row.lender.reputation,
            },
            area: row.area.name,
            coarseArea: row.area,
            created_at: row.created_at,
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
          }) satisfies DiscoveryOffer,
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
  const query = useOffers();
  const [params, setParams] = useSearchParams();
  const search = params.get("q") || "";
  const area = params.get("area") || "all";
  const view = params.get("view") === "list" ? "list" : "map";
  const sort = params.get("sort") || "recent";
  const minimum = params.get("amount") || "";
  const areas = [
    ...new Set((query.data || []).map((offer) => offer.area).filter(Boolean)),
  ];
  const offers = useMemo(() => {
    const result = (query.data || []).filter(
      (offer) =>
        `${offer.title} ${offer.lender.display_name}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (area === "all" || offer.area === area) &&
        (!minimum || Number(offer.available_amount) >= Number(minimum) * 100),
    );
    if (sort === "amount")
      result.sort(
        (left, right) =>
          Number(right.available_amount) - Number(left.available_amount),
      );
    if (sort === "rate")
      result.sort(
        (left, right) => left.annual_rate_bps - right.annual_rate_bps,
      );
    return result;
  }, [query.data, search, area, sort, minimum]);
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    value && value !== "all" ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  }
  return (
    <DiscoveryWorkspace
      offers={offers}
      areas={areas}
      search={search}
      area={area}
      sort={sort}
      minimum={minimum}
      view={view}
      setFilter={setFilter}
      onClear={() => setParams({ view })}
      renderOffer={(offer) => <OfferRow offer={offer} />}
      pending={query.isPending}
      error={query.error}
      retry={() => void query.refetch()}
      hasNext={!!query.hasNextPage}
      fetchingNext={query.isFetchingNextPage}
      loadNext={() => void query.fetchNextPage()}
    />
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
      <section
        className="offer-lender-summary"
        aria-label="Offer lender and capacity"
      >
        <PersonName person={offer.lender} subtitle={offer.area} />
        <div className="offer-detail-amount">
          <span>Self-declared amount available to lend</span>
          <strong>{money(offer.available_amount)}</strong>
        </div>
      </section>
      <OfferCalculator offer={offer} canApply={!owned} />
      <div className="detail-layout">
        <section className="surface">
          <h2>The lender’s original offer</h2>
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
      <OfferSocial offerId={offer.id} />
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
                ...(text(data, "co_borrower_invitation_id") &&
                text(data, "co_borrower_invitation_id") !== "none"
                  ? {
                      co_borrower_invitation_id: text(
                        data,
                        "co_borrower_invitation_id",
                      ),
                    }
                  : {}),
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
              max={
                Math.min(
                  Number(query.data.max_amount),
                  Number(query.data.available_amount),
                ) / 100
              }
              defaultValue={
                /^\d+$/.test(params.get("amount") || "") &&
                Number(params.get("amount")) >= Number(query.data.min_amount) &&
                Number(params.get("amount")) <=
                  Math.min(
                    Number(query.data.max_amount),
                    Number(query.data.available_amount),
                  )
                  ? Number(params.get("amount")) / 100
                  : undefined
              }
              required
            />
            <Notice>
              This application uses {query.data.installment_count}{" "}
              {label(query.data.frequency).toLowerCase()} payments from the
              lender’s original offer. Calculator comparison terms are never
              applied automatically.
            </Notice>
            <CoBorrowerApplicationField />
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
