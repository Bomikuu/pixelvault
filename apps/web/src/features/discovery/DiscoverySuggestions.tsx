import { Button } from "@pixelvault/ui";
import { Check, MapPin, Sparkles } from "lucide-react";

export function DiscoverySuggestions({
  areas,
  area,
  minimum,
  sort,
  setFilters,
}: {
  areas: string[];
  area: string;
  minimum: string;
  sort: string;
  setFilters: (values: Record<string, string>) => void;
}) {
  const suggestions: {
    key: string;
    name: string;
    selected: boolean;
    filters: Record<string, string>;
    Icon: typeof MapPin | null;
  }[] = [
    {
      key: "recent",
      name: "Recently listed",
      selected: sort === "recent",
      filters: { sort: "recent" },
      Icon: Sparkles,
    },
    {
      key: "rate",
      name: "Lower interest first",
      selected: sort === "rate",
      filters: { sort: sort === "rate" ? "recent" : "rate" },
      Icon: null,
    },
    {
      key: "amount",
      name: "₱10,000+ available",
      selected: minimum === "10000",
      filters: { amount: minimum === "10000" ? "" : "10000" },
      Icon: null,
    },
    ...areas.slice(0, 5).map((name) => ({
      key: `area-${name}`,
      name,
      selected: area === name,
      filters: { area: area === name ? "" : name },
      Icon: MapPin,
    })),
  ];
  return (
    <div
      aria-label="Suggested offer filters"
      role="group"
      tabIndex={0}
      className="flex min-w-0 items-center gap-2 overflow-x-auto border-t border-border px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-6"
    >
      {suggestions.map(({ key, name, selected, filters, Icon }) => (
        <Button
          key={key}
          variant={selected ? "secondary" : "outline"}
          className="min-h-11! shrink-0 rounded-full! px-4! text-xs!"
          aria-pressed={selected}
          onClick={() => setFilters(filters)}
        >
          {selected ? <Check size={14} /> : Icon ? <Icon size={14} /> : null}
          {name}
        </Button>
      ))}
    </div>
  );
}
