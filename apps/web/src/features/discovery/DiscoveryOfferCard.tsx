import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { PersonName, Status } from "../../components";
import { label, money } from "../../lib/format";
import { OfferLikeButton } from "../engagement/OfferLikeButton";
import type { DiscoveryOffer } from "./types";

export function DiscoveryOfferCard({ offer }: { offer: DiscoveryOffer }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 text-card-foreground transition-colors hover:border-primary/60 sm:p-6">
      <div className="flex items-center justify-between gap-3 [&_.person_small]:text-muted-foreground!">
        <PersonName person={offer.lender} subtitle={offer.area} />
        <Status value={offer.status} />
      </div>
      <Link
        to={`/offers/${offer.id}`}
        className="my-4 flex items-start justify-between gap-3 text-base font-extrabold text-foreground! hover:text-primary!"
      >
        <span>{offer.title}</span>
        <ArrowUpRight size={18} className="mt-0.5 shrink-0" />
      </Link>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Available to lend</dt>
          <dd className="mt-1 text-xl font-extrabold tabular-nums">
            {money(offer.available_amount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Annual interest</dt>
          <dd className="mt-1 font-bold tabular-nums">
            {(offer.annual_rate_bps / 100).toFixed(2)}%{" "}
            <span className="block text-xs font-normal text-muted-foreground">
              reducing balance
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Payment plan</dt>
          <dd className="mt-1 text-sm font-bold">
            {offer.installment_count} {label(offer.frequency).toLowerCase()}{" "}
            payments
          </dd>
        </div>
      </dl>
      <div className="mt-5 rounded-xl bg-muted p-3">
        <span className="block text-[11px] text-muted-foreground">
          Cost example
        </span>
        <strong className="mt-1 block text-sm tabular-nums">
          {money(offer.disclosure.principal)} →{" "}
          {money(offer.disclosure.total_repayment)}
        </strong>
        <span className="mt-1 block text-[11px] text-muted-foreground">
          Principal → total repayment · exact dates in full terms
        </span>
      </div>
      <OfferLikeButton offerId={offer.id} initial={offer.likes} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin size={14} />
          {offer.area || "Area not specified"} · approximate area
        </span>
        <Link
          className="flex min-h-11 items-center gap-2 font-bold text-primary! hover:underline"
          to={`/offers/${offer.id}`}
        >
          View terms & schedule <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}
