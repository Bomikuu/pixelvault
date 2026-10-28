import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarDays,
  ChartPie,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  Percent,
  Repeat2,
  UserRound,
} from "lucide-react";
import { Button } from "@pixelvault/ui";
import type { Offer, Profile } from "@pixelvault/contracts";
import { apiRequest, post } from "../../app/api";
import {
  ActionLink,
  ApiForm,
  MemberAvatar,
  Notice,
  Status,
  VerifiedNote,
} from "../../components";
import { label, money, text } from "../../lib/format";
import { OfferCalculator } from "../engagement/OfferCalculator";
import { OfferSocial } from "../engagement/OfferSocial";
import type { OfferPreview } from "../engagement/types";
import { InvestmentPitch } from "../negotiations/MeetingEntry";
import { offerPanel, OfferSectionHeading } from "./OfferCostPanels";

export function OfferDetailContent({
  offer,
  owned,
}: {
  offer: Offer;
  owned: boolean;
}) {
  const [preview, setPreview] = useState<OfferPreview | null>(null);
  const client = useQueryClient();
  const profilePath = `/members/${offer.lender.handle || offer.lender.id}`;
  const profile = useQuery({
    queryKey: ["profile", offer.lender.handle || offer.lender.id],
    queryFn: () =>
      apiRequest<Profile>(
        `/community/profiles/${offer.lender.handle || offer.lender.id}`,
      ),
  });
  const apply = `/applications/new?offer=${offer.id}${preview ? `&amount=${preview.terms.principal}` : ""}`;
  const terms = preview?.terms;
  return (
    <div className="min-w-0">
      <nav
        aria-label="Offer breadcrumb"
        className="mb-5 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground"
      >
        <Link
          to="/explore"
          className="flex min-h-11 shrink-0 items-center gap-2 text-muted-foreground! hover:text-primary!"
        >
          <ArrowLeft size={15} />
          Explore offers
        </Link>
        <ChevronRight size={13} className="shrink-0" />
        <span className="truncate text-foreground">{offer.title}</span>
      </nav>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <header className="px-1 pb-2">
            <h1 className="text-2xl! font-extrabold! leading-tight! tracking-tight md:text-[28px]!">
              {offer.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Review the full terms before starting a private application.
            </p>
            <div className="mt-5 flex min-w-0 items-center gap-3">
              <MemberAvatar
                name={offer.lender.display_name}
                avatarKey={offer.lender.avatar_key}
                photoUrl={offer.lender.photo_url}
                reputation={offer.lender.reputation}
                size={48}
              />
              <div className="min-w-0">
                <Link
                  to={profilePath}
                  className="text-sm font-extrabold text-foreground! hover:text-primary!"
                >
                  {offer.lender.display_name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {offer.area} · Individual lender
                </p>
              </div>
            </div>
          </header>
          <OfferCalculator
            key={`${offer.id}:${offer.version ?? 0}`}
            offer={offer}
            canApply={false}
            onPreviewChange={setPreview}
          />
          <section
            id="offer-lender"
            className={offerPanel}
            aria-labelledby="offer-lender-title"
          >
            <OfferSectionHeading
              id="offer-lender-title"
              title="About the lender"
              description="Meet the person behind this offer before applying."
              Icon={UserRound}
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <MemberAvatar
                  name={offer.lender.display_name}
                  avatarKey={offer.lender.avatar_key}
                  photoUrl={offer.lender.photo_url}
                  reputation={offer.lender.reputation}
                  size={44}
                />
                <div>
                  <strong className="text-sm">
                    {offer.lender.display_name}
                  </strong>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {offer.area}
                  </p>
                </div>
              </div>
              <ActionLink to={profilePath} variant="outline">
                View profile
                <ArrowRight size={15} />
              </ActionLink>
            </div>
            {profile.data ? (
              <>
                {profile.data.bio && (
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    {profile.data.bio}
                  </p>
                )}
                <dl className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
                  {[
                    [
                      "Community XP",
                      profile.data.reputation?.show_points
                        ? `${profile.data.reputation.points} XP`
                        : "Not shared",
                    ],
                    ["Public achievements", String(profile.data.badges.length)],
                    [
                      "Published reviews",
                      String(
                        profile.data.recommendation_summary?.total ??
                          profile.data.reviews.length,
                      ),
                    ],
                  ].map(([name, value]) => (
                    <div key={name} className="flex flex-col">
                      <dt className="order-2 mt-1 text-[11px] text-muted-foreground">
                        {name}
                      </dt>
                      <dd className="order-1 text-base font-extrabold tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                {profile.isPending
                  ? "Loading the public profile…"
                  : "Public profile details are unavailable. You can try the profile link again."}
              </p>
            )}
            <div className="mt-4 text-[11px] [&_.verified-note]:text-muted-foreground!">
              <VerifiedNote />
            </div>
          </section>
        </div>
        <aside
          className="min-w-0 xl:sticky xl:top-5"
          aria-label="Offer summary and application"
        >
          <div className={`${offerPanel} space-y-5`}>
            <Status value={offer.status} />
            <div>
              <p className="text-xs text-muted-foreground">
                Available to lend · self-declared
              </p>
              <strong className="mt-1 block break-words text-3xl font-extrabold tracking-tight tabular-nums">
                {money(offer.available_amount)}
              </strong>
            </div>
            <Link
              to={profilePath}
              className="flex min-w-0 items-center gap-3 rounded-xl bg-muted p-3 text-foreground! transition-colors hover:bg-accent"
            >
              <MemberAvatar
                name={offer.lender.display_name}
                avatarKey={offer.lender.avatar_key}
                photoUrl={offer.lender.photo_url}
                reputation={offer.lender.reputation}
                size={36}
              />
              <span className="min-w-0 flex-1 truncate text-xs font-bold">
                {offer.lender.display_name}
              </span>
              <ChevronRight size={15} className="shrink-0" />
            </Link>
            <div id="offer-application" className="space-y-2 scroll-mt-5">
              {owned ? (
                <>
                  <Notice>
                    You posted this offer. Review applications in your private
                    workspace.
                  </Notice>
                  {offer.status === "draft" && (
                    <ApiForm
                      onSubmit={(data) =>
                        post(`/offers/${offer.id}/publish`, {
                          operation_id: text(data, "operation_id"),
                        })
                      }
                      onSuccess={() =>
                        client.invalidateQueries({
                          queryKey: ["offer", offer.id],
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
                <>
                  {preview && offer.status === "published" ? (
                    <ActionLink
                      to={apply}
                      className="w-full whitespace-normal! text-center"
                    >
                      {preview.simulation_only
                        ? "Request with original terms"
                        : "Request to borrow"}
                      <ArrowRight size={16} />
                    </ActionLink>
                  ) : (
                    <Button className="w-full" disabled>
                      {offer.status !== "published"
                        ? "Offer unavailable"
                        : "Choose a valid plan"}
                    </Button>
                  )}
                  <InvestmentPitch offer={offer} compact />
                </>
              )}
            </div>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <Info size={15} className="mt-0.5 shrink-0 text-primary" />
              Applying does not create a loan or move funds. There is no fee
              simply for applying.
            </p>
            <div className="border-y border-border py-4">
              <h2 className="mb-4 text-xs! font-extrabold!">
                {preview?.simulation_only
                  ? "Comparison plan"
                  : "Your estimated plan"}
              </h2>
              <dl className="space-y-4 text-[11px]">
                {[
                  {
                    name: "Amount explored",
                    value: preview ? money(terms?.principal) : "—",
                    Icon: FileText,
                  },
                  {
                    name: "Annual reducing rate",
                    value: `${(offer.annual_rate_bps / 100).toFixed(2)}%`,
                    Icon: Percent,
                  },
                  {
                    name: "Payment frequency",
                    value: terms ? label(terms.frequency) : "—",
                    Icon: Repeat2,
                  },
                  {
                    name: "Number of payments",
                    value: terms ? String(terms.installment_count) : "—",
                    Icon: CalendarDays,
                  },
                  {
                    name: "Total repayment",
                    value: preview
                      ? money(preview.disclosure.total_repayment)
                      : "—",
                    Icon: ChartPie,
                  },
                ].map(({ name, value, Icon }) => (
                  <div
                    key={name}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="flex items-start gap-2 text-muted-foreground">
                      <Icon size={14} className="mt-0.5 shrink-0" />
                      {name}
                    </dt>
                    <dd className="shrink-0 font-bold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
                Original offer: {offer.installment_count}{" "}
                {label(offer.frequency).toLowerCase()} payments. Requests carry
                your chosen amount with those original terms.
              </p>
            </div>
            <nav
              aria-label="Offer sections"
              className="-my-2 divide-y divide-border text-[11px]"
            >
              {[
                {
                  name: "View full cost breakdown",
                  href: "#offer-cost-breakdown",
                  Icon: ChartPie,
                },
                {
                  name: "See repayment schedule",
                  href: "#offer-repayment-schedule",
                  Icon: CalendarDays,
                },
                {
                  name: "Learn about this lender",
                  href: "#offer-lender",
                  Icon: Award,
                },
              ].map(({ name, href, Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex min-h-11 items-center gap-2 text-foreground! hover:text-primary!"
                >
                  <Icon size={15} />
                  <span className="flex-1">{name}</span>
                  <ChevronRight size={14} />
                </a>
              ))}
              <Link
                to="/help"
                className="flex min-h-11 items-center gap-2 text-foreground! hover:text-primary!"
              >
                <HelpCircle size={15} />
                Get private support
                <ChevronRight size={14} className="ml-auto" />
              </Link>
            </nav>
          </div>
        </aside>
      </div>
      <div className="mt-5 [&_.offer-conversation]:m-0! [&_.offer-conversation]:rounded-2xl! [&_.offer-conversation]:border-border! [&_.offer-conversation]:bg-card! [&_.offer-conversation]:p-4! sm:[&_.offer-conversation]:p-5! [&_.offer-section-heading_h2]:text-base! [&_.offer-section-heading_h2]:leading-snug! [&_.offer-section-heading_p]:text-xs! [&_.offer-section-heading_p]:text-muted-foreground! [&_.offer-section-heading>svg]:text-primary! [&_.offer-social-note]:text-muted-foreground! [&_.muted]:text-muted-foreground! [&_.offer-comment-list_article]:border-border! [&_.offer-comment-list_p]:text-foreground! [&_.offer-comment-list_time]:text-muted-foreground!">
        <OfferSocial offerId={offer.id} />
      </div>
    </div>
  );
}
