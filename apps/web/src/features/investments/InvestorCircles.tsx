import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { Person } from "@pixelvault/contracts";
import { apiRequest } from "../../app/api";
import { MemberAvatar } from "../../components";
export function InvestorCircles({ offerId }: { offerId: string }) {
  const query = useQuery({
    queryKey: ["offer-investors", offerId],
    queryFn: () =>
      apiRequest<{
        people: { anonymous: boolean; person: Person | null }[];
        total: number;
        more: number;
        capped: boolean;
      }>(`/community/offers/${offerId}/investors`),
  });
  if (!query.data?.total) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <div className="flex -space-x-2" aria-label="Confirmed test contributors">
        {query.data.people.map((row, index) =>
          row.anonymous || !row.person ? (
            <span
              key={index}
              title="Anonymous contributor"
              aria-label="Anonymous contributor"
              className="grid size-10 place-items-center rounded-full border-2 border-card bg-muted text-muted-foreground"
            >
              <UserRound size={17} />
            </span>
          ) : (
            <Link
              to={`/members/${row.person.handle || row.person.id}`}
              key={index}
              aria-label={`${row.person.display_name}, test contributor`}
              className="rounded-full border-2 border-card"
            >
              <MemberAvatar
                name={row.person.display_name}
                avatarKey={row.person.avatar_key}
                photoUrl={row.person.photo_url}
                size={36}
              />
            </Link>
          ),
        )}
        {!!query.data.more && (
          <span className="grid size-10 place-items-center rounded-full border-2 border-card bg-accent text-xs font-bold text-accent-foreground">
            +{query.data.more}
            {query.data.capped ? "+" : ""}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {query.data.total}
        {query.data.capped ? "+" : ""} confirmed test contributor
        {query.data.total === 1 ? "" : "s"} · simulations only
      </span>
    </div>
  );
}
