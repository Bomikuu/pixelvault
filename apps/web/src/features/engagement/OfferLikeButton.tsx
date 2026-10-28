import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@pixelvault/ui";
import { apiRequest } from "../../app/api";
import { useSession } from "../../app/session";

type Likes = { count: number; liked: boolean };
export function OfferLikeButton({
  offerId,
  initial,
}: {
  offerId: string;
  initial?: Likes;
}) {
  const client = useQueryClient();
  const { session } = useSession();
  const location = useLocation();
  const [error, setError] = useState("");
  const key = ["offer-likes", offerId, session?.member?.id ?? "guest"];
  const query = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await apiRequest<{ likes: Likes }>(`/engagement/offers/${offerId}`))
        .likes,
    initialData: initial,
    staleTime: 30_000,
  });
  // Discovery/SSE refreshes can update counts without a separate request per posting.
  useEffect(() => {
    if (initial) client.setQueryData(key, initial);
  }, [initial?.count, initial?.liked, offerId, session?.member?.id, client]);
  const likes = query.data;
  const mutation = useMutation({
    mutationFn: (liked: boolean) =>
      apiRequest<Likes>(`/engagement/offers/${offerId}/like`, {
        method: "PUT",
        body: JSON.stringify({ liked }),
      }),
    onMutate: () => setError(""),
    onSuccess: async (data) => {
      client.setQueryData(key, data);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["offers"] }),
        client.invalidateQueries({ queryKey: ["offer-engagement", offerId] }),
      ]);
    },
    onError: (problem: Error) =>
      setError(problem.message || "Your like wasn't saved. Try again."),
  });
  const count = likes?.count;
  const accessibleCount =
    count === undefined
      ? "count unavailable"
      : `${count} ${count === 1 ? "like" : "likes"}`;
  return (
    <div className="my-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3">
      {session?.member ? (
        <Button
          variant={likes?.liked ? "secondary" : "outline"}
          size="sm"
          className="min-h-10! gap-2! rounded-full! px-4! transition-[background-color,transform] active:scale-95 motion-reduce:transform-none"
          aria-pressed={likes?.liked ?? false}
          aria-label={`${likes?.liked ? "Unlike" : "Like"} offer (${accessibleCount})`}
          disabled={mutation.isPending || !likes || Boolean(query.error)}
          onClick={() => mutation.mutate(!likes?.liked)}
        >
          <Heart
            size={16}
            aria-hidden="true"
            fill={likes?.liked ? "currentColor" : "none"}
          />
          {mutation.isPending ? "Saving…" : likes?.liked ? "Liked" : "Like"}
          <span className="font-extrabold tabular-nums">{count ?? "—"}</span>
        </Button>
      ) : (
        <Button asChild variant="outline" className="rounded-full! gap-2!">
          <Link
            to="/sign-in"
            state={{ from: location.pathname + location.search }}
          >
            <Heart size={16} aria-hidden="true" />
            Like
            <span className="font-extrabold tabular-nums">{count ?? "—"}</span>
          </Link>
        </Button>
      )}
      <span className="text-xs text-muted-foreground">
        {count === undefined
          ? "Loading likes…"
          : `${count.toLocaleString("en-PH")} ${count === 1 ? "person likes" : "people like"} this`}
      </span>
      {(error || query.error) && (
        <span className="w-full text-xs text-destructive" role="alert">
          {error || "Likes couldn't load."}{" "}
          {query.error && (
            <Button
              variant="link"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          )}
        </span>
      )}
    </div>
  );
}
