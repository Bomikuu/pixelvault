import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Button } from "@pixelvault/ui";
import { MemberAvatar } from "../../components";
import { label, money } from "../../lib/format";
import { OfferLikeButton } from "../engagement/OfferLikeButton";
import type { DiscoveryOffer } from "./types";

export function DiscoveryOfferItem({
  offer,
  distance,
  selected,
  mapReady,
  showMap,
  hover,
  focus,
}: {
  offer: DiscoveryOffer;
  distance?: number;
  selected: boolean;
  mapReady: boolean;
  showMap?: () => void;
  hover: (active: boolean) => void;
  focus: (active: boolean) => void;
}) {
  return (
    <article
      id={`discovery-offer-${offer.id}`}
      className={`border-b border-border px-4 py-3 transition-colors hover:bg-muted/60 focus-within:bg-muted/60 motion-reduce:transition-none ${selected ? "bg-accent" : "bg-card"}`}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
      onFocusCapture={() => focus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          focus(false);
      }}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <Link
          to={`/members/${offer.lender.handle || offer.lender.id}`}
          className="flex min-w-0 items-center gap-2.5 text-foreground! hover:text-primary!"
        >
          <MemberAvatar
            name={offer.lender.display_name}
            avatarKey={offer.lender.avatar_key}
            photoUrl={offer.lender.photo_url}
            reputation={offer.lender.reputation}
            size={34}
          />
          <span className="min-w-0">
            <strong className="block truncate text-xs font-bold">
              {offer.lender.display_name}
            </strong>
            <small className="mt-0.5 block truncate text-[10px]! text-muted-foreground">
              {offer.area}
              {distance !== undefined && ` · ~${distance.toFixed(1)} km`}
            </small>
          </span>
        </Link>
        <OfferLikeButton offerId={offer.id} initial={offer.likes} compact />
      </div>
      <Link
        to={`/offers/${offer.id}`}
        className="my-2 flex items-start justify-between gap-2 text-[13px] font-bold leading-snug text-foreground! hover:text-primary!"
        title="View full terms and payment schedule"
      >
        <span className="line-clamp-2">{offer.title}</span>
        <ArrowUpRight
          size={15}
          className="mt-0.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[10px]! text-muted-foreground">
            Available to lend
          </span>
          <strong className="block text-base font-extrabold leading-relaxed tabular-nums">
            {money(offer.available_amount)}
          </strong>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {offer.installment_count} {label(offer.frequency).toLowerCase()}{" "}
            payments
          </p>
        </div>
        <div className="flex shrink-0 items-end gap-2">
          <div className="pb-0.5 text-right">
            <strong className="block text-xs font-bold tabular-nums">
              {(offer.annual_rate_bps / 100).toFixed(2)}%
            </strong>
            <small className="block text-[10px]! text-muted-foreground">
              annual · reducing
            </small>
          </div>
          {showMap && (
            <Button
              variant="ghost"
              size="icon"
              className="size-11!"
              aria-label={`Show ${offer.title} on map`}
              title="Show on map"
              aria-pressed={selected}
              disabled={!mapReady || !offer.coarseArea?.approximate}
              onClick={showMap}
            >
              <MapPin size={16} />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
