import {
  BrandMark,
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
  Menu,
  Map as MapIcon,
  MapPin,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { IllustratedInfoDialog } from "../../components";
import { PlaceSearch } from "./PlaceSearch";
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
  locationError: string;
  openNavigation?: () => void;
  setFilter: (key: string, value: string) => void;
  selectPlace: (place: MapPlace) => void;
  clearPlace: () => void;
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
  locationError,
  openNavigation,
  setFilter,
  selectPlace,
  clearPlace,
}: Props) {
  const activeFilters =
    Number(area !== "all") + Number(!!minimum) + Number(sort !== "recent");
  return (
    <section
      aria-label="Explore controls"
      className="space-y-2.5 bg-card p-3 text-card-foreground"
    >
      <h1 className="sr-only">Explore lending offers</h1>
      {openNavigation && (
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <Link to="/explore" aria-label="PixelVault home">
            <BrandMark className="gap-2! [&>svg]:h-8! [&>svg]:w-7! [&_.brand-word]:text-lg! dark:[&_.brand-word]:text-foreground!" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={openNavigation}
          >
            <Menu size={20} />
          </Button>
        </div>
      )}
      <div className="flex min-w-0 items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <Link to="/help#test-mode" className="shrink-0 text-primary!">
          Test mode · no real funds
        </Link>
        <span className="truncate" title={place.name}>
          {radius ? `${radius} km around ` : "Center: "}
          <strong className="font-semibold">{place.name}</strong>
        </span>
      </div>
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
          </PopoverContent>
        </Popover>
      </div>
      {locationError && (
        <p role="alert" className="text-xs leading-relaxed text-destructive">
          {locationError}
        </p>
      )}
    </section>
  );
}
