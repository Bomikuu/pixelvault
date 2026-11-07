import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeArt,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@pixelvault/ui";
import {
  ArrowRight,
  Heart,
  HandCoins,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import type {
  ApiSchemas,
  Award,
  Disclosure,
  Offer,
  Person,
  Terms,
} from "@pixelvault/contracts";
import {
  Action,
  DisclosureBlock,
  Empty,
  ErrorState,
  Field,
  Form,
  Heading,
  Illustration,
  Loading,
  Note,
  Page,
  Panel,
  PersonAvatar,
  PersonLine,
  Picker,
  Status,
  TextField,
  money,
  date,
} from "../../components/ui";
import { api, operationId, post } from "../../app/api";
import { ConfirmAction } from "../../components/ConfirmAction";
import { useMemberQuery, useSession } from "../../app/session";
import { useDiscovery } from "../explore/data";
export function toCentavos(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim()))
    throw new Error("Enter a peso amount with up to two decimal places.");
  const [whole, fraction = ""] = value.trim().split(".");
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount < 1n)
    throw new Error("Enter an amount within the supported range.");
  return Number(amount);
}
export function pesoInput(value: number | string) {
  const n = BigInt(value);
  return `${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
}
type Preview = ApiSchemas["schemas"]["CalculatorPreview"];
export function LoanPlanner({
  offer,
  onAmount,
}: {
  offer: Offer;
  onAmount?: (value: number) => void;
}) {
  const available = Number(offer.available_amount),
    initial = Math.min(
      Number(offer.terms.principal),
      Number(offer.max_amount),
      available,
    );
  const [amount, setAmount] = useState(pesoInput(initial)),
    [frequency, setFrequency] = useState(
      offer.frequency || offer.terms.frequency,
    ),
    [count, setCount] = useState(
      String(offer.installment_count || offer.terms.installment_count),
    ),
    [input, setInput] = useState(initial),
    [inputError, setInputError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const value = toCentavos(amount);
        setInput(value);
        onAmount?.(value);
        setInputError("");
      } catch (e) {
        setInputError(e instanceof Error ? e.message : "Enter a valid amount.");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [amount]);
  const preview = useQuery({
    queryKey: ["mobile-calculator", offer.id, input, frequency, count],
    queryFn: ({ signal }) =>
      api<Preview>(
        `/engagement/offers/${offer.id}/calculator?${new URLSearchParams({ principal: String(input), frequency, installment_count: count })}`,
        { signal },
      ),
    enabled: !inputError && input > 0,
  });
  const result = preview.data?.disclosure;
  return (
    <section>
      <Heading>Plan your loan</Heading>
      <div className="space-y-4">
        <Field
          label="Amount to borrow (₱)"
          name="preview_amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          type="text"
        />
        <div className="grid grid-cols-2 gap-3">
          <Picker
            label="Payment frequency"
            value={frequency}
            onChange={setFrequency}
            options={(
              preview.data?.limits.frequencies || [
                "weekly",
                "twice_monthly",
                "monthly",
                "maturity",
              ]
            ).map((value) => ({ value, label: value.replaceAll("_", " ") }))}
          />
          <Picker
            label="Payments"
            value={count}
            onChange={setCount}
            options={Array.from(
              { length: preview.data?.limits.max_installments || 24 },
              (_, i) => ({
                value: String(i + 1),
                label: `${i + 1} ${i ? "payments" : "payment"}`,
              }),
            )}
          />
        </div>
      </div>
      <div
        className="my-5 border-y border-border py-4"
        aria-live="polite"
        aria-busy={preview.isFetching}
      >
        {inputError ? (
          <Note danger>{inputError}</Note>
        ) : preview.error ? (
          <ErrorState error={preview.error} />
        ) : result ? (
          <>
            <p className="mb-3 text-xs font-semibold text-muted-foreground">
              Estimated repayment summary
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                ["Total interest", result.total_interest],
                ["Total repayment", result.total_repayment],
                ["First payment", result.schedule?.[0]?.total],
                ["Net proceeds", result.net_proceeds],
              ].map(([name, value]) => (
                <div key={String(name)}>
                  <dt className="text-xs text-muted-foreground">
                    {String(name)}
                  </dt>
                  <dd className="mt-1 text-lg font-extrabold tracking-tight tabular-nums">
                    {money(value as string | number | undefined)}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <div className="min-h-32">
            <Loading />
          </div>
        )}
      </div>
      {preview.data && (
        <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
          {preview.data.notice}
        </p>
      )}
      <DisclosureBlock title="Full cost breakdown">
        {result && (
          <dl className="space-y-3">
            {[
              ["Principal", result.principal],
              ["Total interest", result.total_interest],
              ["Total repayment", result.total_repayment],
            ].map(([name, value]) => (
              <div
                key={String(name)}
                className="flex justify-between gap-3 text-sm"
              >
                <dt className="text-muted-foreground">{String(name)}</dt>
                <dd className="font-bold tabular-nums">
                  {money(value as string | number | undefined)}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">Effective annual rate</dt>
              <dd className="font-bold">
                {String(result.effective_annual_percentage || "—")}%
              </dd>
            </div>
          </dl>
        )}
        <Note>
          These are server-calculated estimates. Final terms are disclosed in
          the agreement that both parties review.
        </Note>
      </DisclosureBlock>
      <DisclosureBlock title="Repayment schedule">
        {result?.schedule?.map((line, index) => (
          <div
            key={`${line.due_date}-${index}`}
            className="flex justify-between gap-3 border-b border-border py-3 text-sm"
          >
            <div>
              <p className="font-semibold">{date(line.due_date)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {money(line.principal)} principal + {money(line.interest)}{" "}
                interest
              </p>
            </div>
            <strong className="tabular-nums">{money(line.total)}</strong>
          </div>
        ))}
      </DisclosureBlock>
    </section>
  );
}
type Social = ApiSchemas["schemas"]["OfferSocial"];
export function OfferConversation({ id }: { id: string }) {
  const { session } = useSession();
  const [reactions, setReactions] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const key = useRef(operationId());
  const [more, setMore] = useState<Social["comments"]>([]),
    [next, setNext] = useState<string | null | undefined>(undefined),
    [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setMore([]);
    setNext(undefined);
  }, [id]);
  const social = useQuery({
    queryKey: ["mobile-social", session?.member?.id, id],
    queryFn: ({ signal }) =>
      api<Social>(`/engagement/offers/${id}`, { signal }),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
  async function react(award_id: string | null) {
    setBusy(true);
    setError(null);
    try {
      await api(`/engagement/offers/${id}/reaction`, {
        method: "PUT",
        body: JSON.stringify({ award_id }),
      });
      await social.refetch();
      setReactions(false);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (social.error)
    return <ErrorState error={social.error} retry={() => social.refetch()} />;
  return (
    <section>
      <Heading
        action={
          <Button variant="outline" onClick={() => setReactions(true)}>
            <BadgeArt
              badgeKey="good_neighbor"
              name="Achievement reactions"
              size={24}
            />
            {social.data?.reactions.reduce((sum, row) => sum + row.count, 0) ||
              0}
          </Button>
        }
      >
        Community conversation
      </Heading>
      {error !== null && <ErrorState error={error} />}
      <p className="mb-4 text-sm text-muted-foreground">
        Ask about the offer. Keep personal details and repayment concerns
        private.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {social.data?.reactions.map((row) => (
          <Button
            key={row.key}
            variant="outline"
            aria-label={`${row.name}: ${row.count} reactions`}
            onClick={() => setReactions(true)}
          >
            <BadgeArt badgeKey={row.key} name={row.name} size={28} />
            {row.count}
          </Button>
        ))}
      </div>
      {session?.member ? (
        <Form
          submit="Post comment"
          resetOnSuccess
          onSubmit={async (data) => {
            await post(`/engagement/offers/${id}/comments`, {
              body: String(data.get("body") || ""),
              operation_id: key.current,
            });
            key.current = operationId();
            await social.refetch();
          }}
          success="Comment submitted for moderation."
        >
          <TextField
            label="Your comment"
            name="body"
            maxLength={1200}
            required
            placeholder="What would you like to clarify?"
          />
        </Form>
      ) : (
        <Action to="/sign-in" variant="outline" className="w-full">
          Sign in to join the conversation
        </Action>
      )}
      <div className="mt-5 space-y-5">
        {[
          ...new Map(
            [...(social.data?.comments || []), ...more].map((row) => [
              row.id,
              row,
            ]),
          ).values(),
        ].map((comment) => (
          <article key={comment.id} className="border-t border-border pt-4">
            <PersonLine
              person={comment.author}
              subtitle={`${date(comment.created_at)}${comment.status !== "approved" ? " (awaiting moderation)" : ""}`}
            />
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {comment.body}
            </p>
          </article>
        ))}
      </div>
      {(next === undefined ? social.data?.comments_next_cursor : next) && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          disabled={loadingMore}
          onClick={async () => {
            setLoadingMore(true);
            setError(null);
            try {
              const page = await api<Social>(
                `/engagement/offers/${id}?cursor=${encodeURIComponent(next === undefined ? social.data!.comments_next_cursor! : next!)}`,
              );
              setMore((rows) => [...rows, ...page.comments]);
              setNext(page.comments_next_cursor);
            } catch (e) {
              setError(e);
            } finally {
              setLoadingMore(false);
            }
          }}
        >
          {loadingMore ? "Loading comments…" : "Load more comments"}
        </Button>
      )}
      <Dialog open={reactions} onOpenChange={setReactions}>
        <DialogContent>
          <Illustration
            scene="community-workshop"
            className="mx-auto max-w-48"
          />
          <DialogTitle>Leave a little recognition.</DialogTitle>
          <DialogDescription>
            Choose one of your eligible, shareable achievements. A reaction is
            appreciation, not a lending guarantee.
          </DialogDescription>
          {session?.member ? (
            social.data?.reaction_choices.length ? (
              <div className="grid grid-cols-2 gap-3">
                {social.data.reaction_choices.map((award) => (
                  <Button
                    key={award.id}
                    variant={
                      social.data?.my_reaction?.id === award.id
                        ? "secondary"
                        : "outline"
                    }
                    className="h-auto! min-h-24 flex-col! py-3! text-xs"
                    disabled={busy}
                    onClick={() => void react(award.id)}
                  >
                    <BadgeArt
                      badgeKey={award.key}
                      name={award.name}
                      size={44}
                    />
                    {award.name}
                  </Button>
                ))}
              </div>
            ) : (
              <Note>
                No eligible achievements are available to leave yet. You can
                still like the offer or ask a question.
              </Note>
            )
          ) : (
            <Action to="/sign-in">Sign in</Action>
          )}
          {social.data?.my_reaction && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void react(null)}
            >
              Remove my reaction
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function OfferScreen() {
  const { offerId = "" } = useParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | null>(null);
  const [pitch, setPitch] = useState(false);
  const key = useRef(operationId());
  const offer = useMemberQuery<Offer>(["offer", offerId], `/offers/${offerId}`);
  const discovery = useDiscovery();
  const publicOffer = discovery.data?.pages
    .flatMap((page) => page.offers)
    .find((row) => row.id === offerId);
  const investors = useQuery({
    queryKey: ["mobile-investors", offerId],
    queryFn: ({ signal }) =>
      api<{
        people: { anonymous: boolean; person: Person | null }[];
        total: number;
        more: number;
      }>(`/community/offers/${offerId}/investors`, { signal }),
  });
  if (!session?.member)
    return (
      <Page title={publicOffer?.title || "Review this offer."} back>
        <PersonLine
          person={
            publicOffer?.lender || {
              id: "",
              display_name: "Your lending community",
            }
          }
          subtitle={publicOffer?.area.name}
        />
        {publicOffer && (
          <Panel>
            <p className="text-sm text-muted-foreground">Available to lend</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums">
              {money(publicOffer.declared_available_amount)}
            </p>
            <p className="mt-3 text-sm">
              {(publicOffer.terms.annual_rate_bps / 100).toFixed(2)}% annual
              interest, {publicOffer.terms.installment_count} payments.
            </p>
          </Panel>
        )}
        <Note>
          Sign in to review the full current terms, calculate a plan or start a
          private application.
        </Note>
        <Action to="/sign-in" className="w-full">
          Sign in to review
        </Action>
        <OfferConversation id={offerId} />
      </Page>
    );
  if (offer.isPending) return <Loading />;
  if (offer.error || !offer.data)
    return (
      <Page title="Offer unavailable" back>
        <ErrorState error={offer.error} retry={() => offer.refetch()} />
      </Page>
    );
  const data = offer.data,
    own = data.lender.id === session.member.id;
  return (
    <Page
      title={data.title}
      description="Review the terms before starting a private conversation."
      back
    >
      <PersonLine
        person={data.lender}
        subtitle={data.area}
        to={`/members/${data.lender.handle || data.lender.id}`}
      />
      <div className="flex items-end justify-between gap-3 border-b border-border pb-5">
        <div>
          <p className="text-xs text-muted-foreground">Available to lend</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">
            {money(data.available_amount)}
          </p>
        </div>
        <Status value={data.status} />
      </div>
      {own && data.status === "draft" && (
        <ConfirmAction
          label="Publish this test offer"
          title="Publish your reviewed offer?"
          description="Your offer and its current declared capacity will become visible in public discovery. Eligibility is rechecked."
          fingerprint={`${data.id}:${data.version}`}
          reconcile={() => offer.refetch()}
          onConfirm={async () => {
            await post(`/offers/${offerId}/publish`, {});
            await offer.refetch();
            await discovery.refetch();
          }}
        />
      )}
      <LoanPlanner key={data.id} offer={data} onAmount={setAmount} />
      <section>
        <Heading>About the lender</Heading>
        <PersonLine
          person={data.lender}
          subtitle="Individual lender"
          to={`/members/${data.lender.handle || data.lender.id}`}
        />
        <Note>
          Verification records a check. It does not guarantee repayment, legal
          lending authority or investment returns.
        </Note>
      </section>
      {!!investors.data?.total && (
        <section>
          <Heading>Confirmed test contributors</Heading>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {investors.data.people.map((entry, index) => (
                <div
                  key={index}
                  className="rounded-full border-2 border-card"
                  title={
                    entry.anonymous
                      ? "Anonymous contributor"
                      : entry.person?.display_name
                  }
                >
                  {entry.person ? (
                    <PersonAvatar person={entry.person} size={36} />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-full bg-muted">
                      <Users className="size-4" />
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {investors.data.total} contributors
              {investors.data.more ? `, +${investors.data.more} more` : ""}
            </p>
          </div>
        </section>
      )}
      <OfferConversation id={offerId} />
      {!own && (
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] -mx-5 space-y-2 border-t border-border bg-card px-5 py-3">
          <Action
            to={`/offers/${offerId}/apply${amount ? `?amount=${amount}` : ""}`}
            className="w-full"
          >
            Apply for this loan
            <ArrowRight />
          </Action>
          <Button
            variant="ghost"
            className="min-h-11 w-full text-sm"
            onClick={() => setPitch(true)}
          >
            <HandCoins />
            Send an investor pitch
          </Button>
        </div>
      )}
      <Dialog open={pitch} onOpenChange={setPitch}>
        <DialogContent>
          <DialogTitle>Start with a private pitch.</DialogTitle>
          <DialogDescription>
            Propose a contribution, then meet to discuss collected-interest
            sharing, allocated risk and the separate demonstration fee. No funds
            move from sending a pitch.
          </DialogDescription>
          <Form
            submit="Request a meeting"
            onSubmit={async (form) => {
              const result = await post<{ id: string }>("/meetings", {
                kind: "investment",
                offer_id: offerId,
                amount: toCentavos(String(form.get("amount") || "")),
                share_bps: (() => {
                  const value = String(form.get("share") || "");
                  if (
                    !/^\d{1,3}(?:\.\d{1,2})?$/.test(value) ||
                    Number(value) > 100
                  )
                    throw new Error("Enter a share from 0 to 100 percent.");
                  const [whole, fraction = ""] = value.split(".");
                  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
                })(),
                operation_id: key.current,
              });
              key.current = operationId();
              navigate(`/meetings/${result.id}`);
            }}
          >
            <Field
              name="amount"
              label="Proposed contribution (₱)"
              inputMode="decimal"
              required
              defaultValue="1000.00"
            />
            <Field
              name="share"
              label="Proposed share of collected interest (%)"
              inputMode="decimal"
              required
              defaultValue="20.00"
            />
          </Form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
