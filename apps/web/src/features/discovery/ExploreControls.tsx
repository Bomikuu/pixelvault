import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pixelvault/ui";
import {
  ArrowDownWideNarrow,
  List,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { IllustratedInfoDialog } from "../../components";
import { PlaceSearch } from "./PlaceSearch";
import type { MapCommand } from "./geography";
import type { MapPlace } from "./types";

interface Props {
  token: string;
  search: string;
  areas: string[];
  area: string;
  minimum: string;
  sort: string;
  view: string;
  radius: number;
  place: MapPlace;
  mapReady: boolean;
  locating: boolean;
  locationError: string;
  setFilter: (key: string, value: string) => void;
  selectPlace: (place: MapPlace) => void;
  clearPlace: () => void;
  locate: () => void;
  command: (type: MapCommand["type"]) => void;
}
export function ExploreControls({
  token,
  search,
  areas,
  area,
  minimum,
  sort,
  view,
  radius,
  place,
  mapReady,
  locating,
  locationError,
  setFilter,
  selectPlace,
  clearPlace,
  locate,
  command,
}: Props) {
  const activeFilters =
    Number(area !== "all") + Number(!!minimum) + Number(sort !== "recent");
  return (
    <section
      aria-label="Explore controls"
      className="order-1 space-y-3 rounded-t-2xl border border-border bg-card p-4 text-card-foreground lg:rounded-none lg:border-0 lg:border-b"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl! font-extrabold leading-tight tracking-tight">
            Meet your lending community.
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            People nearby. Clear terms. A private next step.
          </p>
        </div>
        <IllustratedInfoDialog
          title="Nearby, with boundaries."
          description="Explore public lending intentions by approximate area. Review the complete terms before applying."
          scene="finding-your-way"
          triggerLabel="How discovery works"
          iconOnly
        >
          <p>
            Markers group public city or area centers, never anyone’s home.
            Radius results measure the distance to those centers. They cover
            loaded offers; load more to extend your search.
          </p>
        </IllustratedInfoDialog>
      </header>
      <PlaceSearch
        token={token}
        value={search}
        onChange={(value) => setFilter("q", value)}
        onSelect={selectPlace}
      />
      <div className="flex gap-2">
        <Select
          value={String(radius)}
          onValueChange={(value) =>
            setFilter("radius", value === "0" ? "" : value)
          }
        >
          <SelectTrigger
            className="h-11! min-w-0 flex-1 text-xs"
            aria-label="Search radius"
          >
            <MapPin size={15} className="shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any distance</SelectItem>
            <SelectItem value="5">Within 5 km</SelectItem>
            <SelectItem value="10">Within 10 km</SelectItem>
            <SelectItem value="50">Within 50 km</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="h-11! shrink-0 text-xs"
          aria-label={
            view === "map" ? "Switch to list view" : "Switch to map view"
          }
          onClick={() => setFilter("view", view === "map" ? "list" : "map")}
        >
          {view === "map" ? <List size={16} /> : <MapIcon size={16} />}
          {view === "map" ? "List" : "Map"}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={activeFilters ? "secondary" : "outline"}
              size="icon"
              className="relative size-11! shrink-0"
              aria-label={`More filters${activeFilters ? `, ${activeFilters} active` : ""}`}
            >
              <SlidersHorizontal size={17} />
              {activeFilters > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {activeFilters}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-72 max-w-[calc(100vw-24px)] space-y-4 p-4"
          >
            <h2 className="text-sm font-bold">Filter offers</h2>
            {place.id !== "quezon-city" && (
              <Button
                variant="ghost"
                className="w-full justify-start! text-xs"
                onClick={clearPlace}
              >
                <X size={14} />
                Reset search center to Quezon City
              </Button>
            )}
            <div className="space-y-2">
              <Label htmlFor="discovery-area">Approximate area</Label>
              <Select
                value={area}
                onValueChange={(value) => setFilter("area", value)}
              >
                <SelectTrigger id="discovery-area" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All areas</SelectItem>
                  {areas.map((name) => (
                    <SelectItem value={name} key={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discovery-minimum">Minimum available ₱</Label>
              <Input
                id="discovery-minimum"
                type="number"
                min={0}
                value={minimum}
                placeholder="Any amount"
                onChange={(event) => setFilter("amount", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discovery-sort">Sort offers</Label>
              <Select
                value={sort}
                onValueChange={(value) => setFilter("sort", value)}
              >
                <SelectTrigger id="discovery-sort" className="w-full">
                  <ArrowDownWideNarrow size={15} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently listed</SelectItem>
                  <SelectItem value="amount">Available amount</SelectItem>
                  <SelectItem value="rate">Annual interest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <div className="flex min-w-0 items-center justify-between gap-1">
          <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">
            <span className="block">
              {radius ? `${radius} km around` : "Search center"}
            </span>
            <strong
              className="block truncate font-semibold text-foreground"
              title={place.name}
            >
              {place.name}
            </strong>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-11! shrink-0"
            aria-label={locating ? "Finding your location" : "Use my location"}
            title="Use my location"
            onClick={locate}
            disabled={locating}
          >
            {locating ? (
              <Loader2
                size={17}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <LocateFixed size={17} />
            )}
          </Button>
          {view === "map" && (
            <div
              className="flex shrink-0"
              role="group"
              aria-label="Map controls"
            >
              <Button
                variant="ghost"
                size="icon"
                className="size-11!"
                aria-label="Zoom out"
                title="Zoom out"
                disabled={!mapReady}
                onClick={() => command("zoom-out")}
              >
                <Minus size={17} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11!"
                aria-label="Zoom in"
                title="Zoom in"
                disabled={!mapReady}
                onClick={() => command("zoom-in")}
              >
                <Plus size={17} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11!"
                aria-label={mapReady ? "Fit search area" : "Retry map"}
                title={mapReady ? "Fit search area" : "Retry map"}
                onClick={() => command(mapReady ? "reset" : "retry")}
              >
                <RotateCcw size={16} />
              </Button>
            </div>
          )}
        </div>
        {locationError && (
          <p role="alert" className="text-xs leading-relaxed text-destructive">
            {locationError}
          </p>
        )}
        {radius > 0 && (
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Distance uses public area centers, not home locations.
          </p>
        )}
      </div>
    </section>
  );
}
