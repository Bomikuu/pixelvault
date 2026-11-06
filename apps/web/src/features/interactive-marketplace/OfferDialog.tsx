import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { Offer } from "@pixelvault/contracts";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@pixelvault/ui";
import { ArrowUpRight, ArrowRight, Loader2 } from "lucide-react";
import { apiRequest } from "../../app/api";
import {
  ActionLink,
  MemberAvatar,
  ErrorNotice,
  Loading,
} from "../../components";
import { OfferCalculator } from "../engagement/OfferCalculator";
import { useSession } from "../../app/session";
import { money } from "../../lib/format";
export function OfferDialog({
  offerId,
  onClose,
}: {
  offerId: string | null;
  onClose: () => void;
}) {
  const { session } = useSession(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const query = useQuery({
    queryKey: ["plaza-offer", offerId, session?.member?.id],
    queryFn: ({ signal }) =>
      apiRequest<Offer>(`/offers/${offerId}`, { signal }),
    enabled: !!offerId && !!session?.member,
    refetchInterval: 5000,
    retry: false,
  });
  const offer = query.data;
  const available = (o: Offer) =>
    o.status === "published" &&
    Number(o.available_amount) >= Number(o.min_amount) &&
    Date.parse(o.expires_at) > Date.now();
  const owned = !!offer && offer.lender.id === session?.member?.id;
  return (
    <Dialog
      open={!!offerId}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="grid-cols-[minmax(0,1fr)]! [&>*]:min-w-0 w-[calc(100%-1.5rem)]! max-w-3xl! max-h-[calc(100dvh-1.5rem)]! overflow-x-hidden! overflow-y-auto! p-4! sm:p-6!">
        <DialogTitle className="pr-8 text-xl!">
          {offer?.title || "Offer details"}
        </DialogTitle>
        <DialogDescription>
          Current lender terms, costs and payment dates. Opening an offer does
          not create a loan.
        </DialogDescription>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorNotice error={query.error} />
        ) : (
          offer && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    name={offer.lender.display_name}
                    avatarKey={offer.lender.avatar_key}
                    photoUrl={offer.lender.photo_url}
                    reputation={offer.lender.reputation}
                  />
                  <div>
                    <strong className="text-sm">
                      {offer.lender.display_name}
                    </strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {offer.area} · Individual lender
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Available to lend
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums">
                    {money(offer.available_amount)}
                  </p>
                </div>
              </div>
              {available(offer) ? (
                <OfferCalculator
                  key={`${offer.id}:${offer.version}`}
                  offer={offer}
                  canApply={false}
                />
              ) : (
                <p
                  role="status"
                  className="rounded-xl border border-border bg-muted p-4 text-sm"
                >
                  This offer is no longer available to apply for. Explore
                  another current offer.
                </p>
              )}
              {!!error && <ErrorNotice error={error} />}
              <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-1 pt-4 pb-1">
                <ActionLink to={`/offers/${offer.id}`} variant="outline">
                  Full offer
                  <ArrowUpRight className="size-4" />
                </ActionLink>
                <ActionLink
                  to={`/members/${offer.lender.handle}`}
                  variant="ghost"
                >
                  Lender profile
                </ActionLink>
                <Button
                  disabled={busy || owned || !available(offer)}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      const result = await query.refetch({
                        throwOnError: true,
                      });
                      if (!result.data || !available(result.data))
                        throw new Error(
                          "This offer changed. Review its current state before applying.",
                        );
                      onClose();
                      navigate(`/applications/new?offer=${offer.id}`);
                    } catch (e) {
                      setError(e);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                  {owned ? "Your offer" : "Review application"}
                </Button>
              </div>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
