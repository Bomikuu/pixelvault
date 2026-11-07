import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { ArrowUpRight, Heart, Bookmark } from "lucide-react";
import { IconButton, PersonAvatar, money } from "../../components/ui";
import { api } from "../../app/api";
import { useMemberQuery, useSession } from "../../app/session";
import type { DiscoveryOffer, Discovery } from "./data";
export function OfferCard({
  offer,
  compact = false,
  onFocus,
}: {
  offer: DiscoveryOffer;
  compact?: boolean;
  onFocus?: () => void;
}) {
  const { session } = useSession();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [likes, setLikes] = useState(offer.likes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedOverride, setSaved] = useState<boolean | null>(null);
  const savedQuery = useMemberQuery<{ saved: { id: string }[] }>(
    ["saved"],
    "/hub/saved-offers",
  );
  const saved =
    savedOverride ??
    !!savedQuery.data?.saved.some((row) => row.id === offer.id);
  useEffect(() => {
    if (!busy) setLikes(offer.likes);
  }, [offer.likes.count, offer.likes.liked, busy]);
  const current = likes === offer.likes ? offer.likes : likes;
  return (
    <article
      onMouseEnter={onFocus}
      onFocus={onFocus}
      className={`group rounded-2xl border border-border bg-card transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-sm ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-center gap-2">
        <Link
          to={`/members/${offer.lender.handle}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <PersonAvatar person={offer.lender} size={compact ? 36 : 44} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold group-hover:text-primary">
              {offer.lender.display_name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {offer.area.name}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-0.5">
          <IconButton
            label={`${current.liked ? "Unlike" : "Like"} offer, ${current.count} likes`}
            aria-pressed={current.liked}
            disabled={busy}
            onClick={async () => {
              if (!session?.member) {
                navigate("/sign-in", { state: { from: "/explore" } });
                return;
              }
              setBusy(true);
              setError("");
              const before = current;
              setLikes({
                liked: !before.liked,
                count: before.count + (before.liked ? -1 : 1),
              });
              try {
                const next = await api<{ liked: boolean; count: number }>(
                  `/engagement/offers/${offer.id}/like`,
                  {
                    method: "PUT",
                    body: JSON.stringify({ liked: !before.liked }),
                  },
                );
                cache.setQueriesData<InfiniteData<Discovery>>(
                  { queryKey: ["mobile-discovery", session.member.id] },
                  (old) =>
                    old
                      ? {
                          ...old,
                          pages: old.pages.map((page) => ({
                            ...page,
                            offers: page.offers.map((row) =>
                              row.id === offer.id
                                ? { ...row, likes: next }
                                : row,
                            ),
                          })),
                        }
                      : old,
                );
                setLikes(next);
                void cache.invalidateQueries({
                  queryKey: ["mobile-discovery"],
                });
              } catch (e) {
                setLikes(before);
                setError(
                  e instanceof Error ? e.message : "Like could not save.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Heart
              className={`size-4 ${current.liked ? "fill-primary text-primary" : ""}`}
            />
            <span className="text-xs tabular-nums">{current.count}</span>
          </IconButton>
          {!compact && (
            <IconButton
              label={saved ? "Remove saved offer" : "Save offer"}
              aria-pressed={saved}
              disabled={busy}
              onClick={async () => {
                if (!session?.member) {
                  navigate("/sign-in", { state: { from: "/explore" } });
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  await api(`/hub/saved-offers/${offer.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ saved: !saved }),
                  });
                  setSaved(!saved);
                  void cache.invalidateQueries({
                    queryKey: ["member", session.member.id, "saved"],
                  });
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not save offer.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Bookmark
                className={`size-4 ${saved ? "fill-primary text-primary" : ""}`}
              />
            </IconButton>
          )}
        </div>
      </div>
      <Link to={`/offers/${offer.id}`} className="mt-3 block rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold leading-snug tracking-tight">
            {offer.title}
          </h2>
          <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-primary" />
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Available to lend</p>
            <p
              className={`${compact ? "text-lg" : "text-xl"} mt-1 font-extrabold tracking-tight tabular-nums`}
            >
              {money(offer.declared_available_amount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Annual interest</p>
            <p className="mt-1 text-sm font-bold tabular-nums">
              {(offer.terms.annual_rate_bps / 100).toFixed(2)}%
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {offer.terms.installment_count}{" "}
          {offer.terms.frequency.replaceAll("_", " ")} payments
        </p>
      </Link>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </article>
  );
}
