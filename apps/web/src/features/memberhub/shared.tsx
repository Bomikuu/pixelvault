import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Bookmark, Check, Loader2 } from "lucide-react";
import { Button } from "@pixelvault/ui";
import { apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import { useState } from "react";
import type { Offer, Person } from "@pixelvault/contracts";

export interface SavedItem {
  id: string;
  saved_at: string;
  available: boolean;
  offer: Offer | null;
}
export interface ActionItem {
  key: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
  at: string;
  urgent: boolean;
  read: boolean;
}
export interface Actions {
  actions: ActionItem[];
  unread: number;
  limit: number;
}
export function useActions() {
  const { session } = useSession();
  return useQuery({
    queryKey: ["actions", session?.member?.id],
    queryFn: () => apiRequest<Actions>("/hub/actions"),
    enabled: !!session?.member,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
}
export function useSavedOffers() {
  const { session } = useSession();
  return useQuery({
    queryKey: ["saved-offers", session?.member?.id],
    queryFn: () =>
      apiRequest<{ saved: SavedItem[]; limit: number }>("/hub/saved-offers"),
    enabled: !!session?.member,
  });
}
export function ActionBell() {
  const query = useActions();
  return (
    <Button asChild variant="ghost" size="icon">
      <Link
        to="/activity"
        className="relative"
        aria-label={`Action center${query.data?.unread ? `, ${query.data.unread} unread` : ""}`}
      >
        <Bell size={19} />
        {!!query.data?.unread && (
          <span
            className="absolute right-0 top-0 rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
            aria-hidden="true"
          >
            {query.data.unread > 99 ? "99+" : query.data.unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
export function SaveOfferButton({
  offerId,
  compact = false,
}: {
  offerId: string;
  compact?: boolean;
}) {
  const { session } = useSession();
  const saved = useSavedOffers();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const selected = !!saved.data?.saved.some((item) => item.id === offerId);
  if (!session?.member)
    return (
      <Button asChild variant="outline" size={compact ? "icon" : "default"}>
        <Link
          to="/sign-in"
          state={{ from: location.pathname + location.search }}
          aria-label="Sign in to save offer"
        >
          <Bookmark size={16} />
          {!compact && "Save offer"}
        </Link>
      </Button>
    );
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={selected ? "secondary" : "outline"}
        size={compact ? "icon" : "default"}
        aria-label={selected ? "Remove saved offer" : "Save offer"}
        aria-pressed={selected}
        disabled={busy || saved.isPending || !!saved.error}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await apiRequest(`/hub/saved-offers/${offerId}`, {
              method: "PUT",
              body: JSON.stringify({ saved: !selected }),
            });
            await saved.refetch();
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Could not save this offer. Try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <Loader2
            size={16}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : selected ? (
          <Check size={16} />
        ) : (
          <Bookmark size={16} />
        )}{" "}
        {!compact && (selected ? "Saved" : "Save offer")}
      </Button>
      {error && (
        <p role="alert" className="max-w-52 text-xs text-destructive">
          {error}
        </p>
      )}
      {saved.error && (
        <Link to="/saved-offers" className="text-xs text-primary!">
          Open saved offers to retry
        </Link>
      )}
    </div>
  );
}
export type CalendarEvent = {
  id: string;
  loan_id: string;
  sequence: number;
  due_date: string;
  amount: string;
  remaining: string;
  covered: string;
  status: string;
  person: Person;
  href: string;
  updated_at: string;
};
export const hubPanel =
  "min-w-0 rounded-[14px] border border-border bg-card p-4 sm:p-5";
