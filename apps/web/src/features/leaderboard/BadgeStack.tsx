import type { Award } from "@pixelvault/contracts";
import {
  BadgeArt,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@pixelvault/ui";
import { date } from "../../lib/format";

function BadgeDetails({ badge }: { badge: Award }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-20 shrink-0 place-items-center rounded-full border border-border bg-white">
        <BadgeArt name={badge.name} badgeKey={badge.key} size={68} />
      </span>
      <div className="min-w-0">
        <strong className="block text-sm text-foreground">{badge.name}</strong>
        <p className="mt-2! text-xs leading-relaxed! text-muted-foreground">
          {badge.criteria || "An earned community achievement."}
        </p>
        {badge.earned_at && (
          <p className="mt-2! text-[11px] text-muted-foreground">
            Earned {date(badge.earned_at)}
          </p>
        )}
      </div>
    </div>
  );
}

export function BadgeStack({
  badges,
  name,
  compact = false,
}: {
  badges: Award[];
  handle?: string;
  name: string;
  compact?: boolean;
}) {
  if (!badges.length)
    return (
      <span className="text-xs text-muted-foreground">No showcased badges</span>
    );
  const circle = "size-11!";
  return (
    <div
      className="flex items-center -space-x-2"
      aria-label={`${name}'s showcased badges`}
    >
      {badges.slice(0, 2).map((badge) => (
        <Popover key={badge.id}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={`${badge.name}, ${name}`}
              className={`relative ${circle} rounded-full! border-border! bg-white! p-1! transition-[transform,box-shadow] duration-200 hover:z-10 hover:-translate-y-1 hover:shadow-md focus-visible:z-10 motion-reduce:transform-none`}
            >
              <BadgeArt
                name={badge.name}
                badgeKey={badge.key}
                size={compact ? 28 : 34}
                className={compact ? "size-7!" : "size-[34px]!"}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            aria-label={`${badge.name} achievement`}
            className="w-88! max-w-[var(--radix-popover-content-available-width)]! p-4!"
          >
            <BadgeDetails badge={badge} />
          </PopoverContent>
        </Popover>
      ))}
      {badges.length > 2 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`relative ${circle} rounded-full! border-border! bg-muted! p-0! text-sm! font-extrabold! text-foreground! transition-colors hover:z-10 hover:bg-accent!`}
              aria-label={`View all ${badges.length} badges for ${name}`}
            >
              +{badges.length - 2}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            aria-label={`${name}'s showcased badges`}
            align="end"
            className="w-96! max-w-[var(--radix-popover-content-available-width)]! p-4!"
          >
            <h3 className="text-sm! font-bold! text-foreground!">
              {name}'s showcased badges
            </h3>
            <p className="mt-1! text-xs text-muted-foreground">
              Selected by the member. Current eligibility applies.
            </p>
            <ul className="mt-4 grid max-h-80 list-none! gap-4 overflow-y-auto p-0!">
              {badges.map((badge) => (
                <li key={badge.id}>
                  <BadgeDetails badge={badge} />
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
