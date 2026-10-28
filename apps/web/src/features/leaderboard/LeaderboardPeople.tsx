import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, LockKeyhole } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pixelvault/ui";
import type { LeaderboardPage } from "@pixelvault/contracts";
import { MemberAvatar } from "../../components";
import { money } from "../../lib/format";
import { BadgeStack } from "./BadgeStack";

export type LeaderboardEntry = LeaderboardPage["entries"][number];
export const number = (value: number) => value.toLocaleString("en-PH");

export function MemberName({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="min-w-0">
      <Link
        className="block text-sm font-extrabold text-foreground! transition-colors [overflow-wrap:anywhere] hover:text-primary! hover:underline focus-visible:text-primary!"
        to={`/members/${entry.handle}`}
      >
        {entry.display_name}
      </Link>
      <span className="mt-1 block text-xs text-muted-foreground">
        {entry.reputation.level}
      </span>
    </div>
  );
}

export function PrivateValue() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <LockKeyhole size={13} aria-hidden="true" />
      Not shared
    </span>
  );
}

export function LeaderboardPeople({
  entries,
  startPosition = 1,
}: {
  entries: LeaderboardEntry[];
  startPosition?: number;
}) {
  const hint = useId();
  return (
    <>
      <p
        id={hint}
        className="mb-3! flex items-center gap-2 text-xs text-muted-foreground xl:hidden"
      >
        <ArrowLeftRight size={16} aria-hidden="true" />
        Scroll sideways to compare all columns.
      </p>
      <div
        role="region"
        aria-label="Community member comparison"
        aria-describedby={hint}
        tabIndex={0}
        className="overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&>[data-slot=table-container]]:overflow-visible"
      >
        <Table
          className="w-full min-w-[760px] text-xs"
          aria-label="Community members"
        >
          <TableHeader>
            <TableRow className="border-border">
              {[
                "Position",
                "Member",
                "Lifetime lent",
                "Loans funded",
                "People helped",
                "Reputation",
                "Badges",
              ].map((heading) => (
                <TableHead
                  scope="col"
                  key={heading}
                  className="bg-muted px-3 py-3 text-[11px] text-muted-foreground"
                >
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow
                key={entry.handle}
                className="group border-border transition-colors duration-150 hover:bg-accent/60 focus-within:bg-accent/60"
              >
                <TableCell className="px-3 py-4">
                  <span
                    className="font-bold text-muted-foreground"
                    aria-label={`Leaderboard position ${entry.position ?? index + startPosition}`}
                  >
                    {entry.position ?? index + startPosition}
                  </span>
                </TableCell>
                <TableCell className="px-3">
                  <div className="flex min-w-44 max-w-64 items-center gap-3 whitespace-normal">
                    <MemberAvatar
                      name={entry.display_name}
                      avatarKey={entry.avatar_key}
                      photoUrl={entry.photo_url}
                      reputation={entry.reputation}
                      size={42}
                    />
                    <MemberName entry={entry} />
                  </div>
                </TableCell>
                <TableCell className="px-3 font-bold tabular-nums">
                  {entry.lending ? (
                    money(entry.lending.total_lent)
                  ) : (
                    <PrivateValue />
                  )}
                </TableCell>
                <TableCell className="px-3 tabular-nums">
                  {entry.lending ? (
                    number(entry.lending.loans_funded)
                  ) : (
                    <PrivateValue />
                  )}
                </TableCell>
                <TableCell className="px-3 tabular-nums">
                  {entry.lending ? (
                    number(entry.lending.people_helped)
                  ) : (
                    <PrivateValue />
                  )}
                </TableCell>
                <TableCell className="px-3 font-bold text-primary tabular-nums">
                  {number(entry.reputation.points)} XP
                </TableCell>
                <TableCell className="px-3">
                  <BadgeStack
                    compact
                    badges={entry.badges ?? []}
                    name={entry.display_name}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
