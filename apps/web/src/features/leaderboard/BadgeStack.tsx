import { Link } from "react-router-dom";
import type { Award } from "@pixelvault/contracts";
import {
  BadgeArt,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pixelvault/ui";

export function BadgeStack({
  badges,
  handle,
  name,
}: {
  badges: Award[];
  handle: string;
  name: string;
}) {
  if (!badges.length)
    return (
      <span className="text-xs text-muted-foreground">No showcased badges</span>
    );
  return (
    <div
      className="flex items-center -space-x-2"
      aria-label={`${name}'s showcased badges`}
    >
      {badges.slice(0, 2).map((badge) => (
        <Tooltip key={badge.id}>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="outline"
              size="icon"
              className="relative size-11! rounded-full! border-border! bg-white! p-1! transition-[transform,box-shadow] duration-200 hover:z-10 hover:-translate-y-1 hover:shadow-md focus-visible:z-10 motion-reduce:transform-none"
            >
              <Link
                to={`/members/${handle}/badges/${badge.id}`}
                aria-label={`${badge.name}, ${name}`}
              >
                <BadgeArt name={badge.name} badgeKey={badge.key} size={32} />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{badge.name}</TooltipContent>
        </Tooltip>
      ))}
      {badges.length > 2 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative size-11! rounded-full! border-border! bg-muted! p-0! text-xs! text-foreground! transition-colors hover:z-10 hover:bg-accent!"
              aria-label={`View all ${badges.length} badges for ${name}`}
            >
              +{badges.length - 2}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            aria-label={`${name}'s showcased badges`}
            align="end"
            className="w-80! max-w-[var(--radix-popover-content-available-width)]! p-4!"
          >
            <h3 className="text-sm! font-bold! text-foreground!">
              {name}'s showcased badges
            </h3>
            <p className="mt-1! text-xs text-muted-foreground">
              Selected by the member. Current eligibility applies.
            </p>
            <ul className="mt-4 grid max-h-72 gap-3 overflow-y-auto">
              {badges.map((badge) => (
                <li key={badge.id}>
                  <Link
                    to={`/members/${handle}/badges/${badge.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 text-foreground! transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-full border border-border bg-white">
                      <BadgeArt
                        name={badge.name}
                        badgeKey={badge.key}
                        size={38}
                      />
                    </span>
                    <span>
                      <strong className="block text-sm">{badge.name}</strong>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {badge.criteria}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
