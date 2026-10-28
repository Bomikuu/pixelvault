import { useEffect, useId, useState } from "react";
import { Button, Input } from "@pixelvault/ui";
import { Loader2, MapPin, Search, X } from "lucide-react";
import type { MapPlace } from "./types";
const allowedTypes = new Set(["place", "locality", "neighborhood"]);
interface GeocodeFeature {
  id?: string;
  geometry?: { coordinates?: number[] };
  properties?: {
    mapbox_id?: string;
    feature_type?: string;
    name?: string;
    place_formatted?: string;
  };
}

export function PlaceSearch({
  token,
  value,
  onChange,
  onSelect,
}: {
  token: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: MapPlace) => void;
}) {
  const id = useId();
  const [lookup, setLookup] = useState<{
    query: string;
    attempt: number;
  } | null>(null);
  const [results, setResults] = useState<MapPlace[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setResults([]);
    setError("");
    setPending(false);
    if (!token || !lookup || lookup.query !== value.trim()) return;
    if (
      lookup.query.length > 80 ||
      !/^[\p{L}\p{M}\s.'’\-]+$/u.test(lookup.query)
    ) {
      setError(
        "Use a city or neighborhood name for place search, without street numbers.",
      );
      return;
    }
    const controller = new AbortController();
    setPending(true);
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.search = new URLSearchParams({
      q: lookup.query,
      types: "place,locality,neighborhood",
      country: "ph",
      autocomplete: "true",
      limit: "5",
      language: "en",
      access_token: token,
    }).toString();
    void (async () => {
      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          credentials: "omit",
        });
        if (!response.ok) throw new Error("search_unavailable");
        const data = (await response.json()) as { features?: GeocodeFeature[] };
        if (controller.signal.aborted) return;
        setResults(
          (data.features || []).flatMap((feature) => {
            const properties = feature.properties || {},
              coordinates = feature.geometry?.coordinates;
            if (
              !allowedTypes.has(properties.feature_type || "") ||
              !coordinates ||
              coordinates.length < 2 ||
              !coordinates.slice(0, 2).every(Number.isFinite)
            )
              return [];
            const [longitude, latitude] = coordinates;
            if (
              longitude < 116 ||
              longitude > 127 ||
              latitude < 4 ||
              latitude > 22
            )
              return [];
            return [
              {
                id:
                  properties.mapbox_id ||
                  feature.id ||
                  `${longitude},${latitude}`,
                name: properties.name || "Philippine area",
                context: properties.place_formatted || "Philippines",
                center: [longitude, latitude] as [number, number],
              },
            ];
          }),
        );
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Places could not load. Try again; lender and offer search still works.",
          );
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    })();
    return () => controller.abort();
  }, [lookup, token, value]);
  const showSuggestions = open && value.trim().length >= 2;
  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          event.stopPropagation();
        }
      }}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Search lending offers"
          aria-description="Search lenders, offers or areas. Choose Find a place to search Mapbox."
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? id : undefined}
          autoComplete="off"
          maxLength={80}
          value={value}
          placeholder="Search a lender, offer or place"
          className="h-11 bg-background pl-9! pr-11! text-sm"
          onChange={(event) => {
            onChange(event.target.value);
            setLookup(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 size-11!"
            aria-label="Clear search"
            onClick={() => {
              onChange("");
              setLookup(null);
              setOpen(false);
            }}
          >
            <X size={16} />
          </Button>
        )}
      </div>
      {showSuggestions && (
        <div
          id={id}
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          aria-label="Search options"
        >
          <p className="px-2 py-2 text-xs text-muted-foreground">
            Lenders and offers filter as you type.
          </p>
          {token ? (
            <>
              <Button
                variant="ghost"
                className="h-auto! min-h-11 w-full justify-start! whitespace-normal! text-left text-xs"
                aria-disabled={pending}
                onClick={() =>
                  !pending &&
                  setLookup((previous) => ({
                    query: value.trim(),
                    attempt: (previous?.attempt ?? 0) + 1,
                  }))
                }
              >
                {pending ? (
                  <Loader2
                    size={16}
                    className="shrink-0 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <MapPin size={16} className="shrink-0" />
                )}
                {pending ? "Finding places…" : `Find a place: ${value.trim()}`}
              </Button>
              {error ? (
                <p role="alert" className="px-2 py-2 text-xs text-destructive">
                  {error}
                </p>
              ) : results.length ? (
                <ul
                  aria-label="Matching Philippine areas"
                  className="border-t border-border pt-1"
                >
                  {results.map((place) => (
                    <li key={place.id}>
                      <Button
                        variant="ghost"
                        className="h-auto! min-h-12 w-full justify-start! whitespace-normal! text-left"
                        aria-label={`Search around ${place.name}, ${place.context}`}
                        onClick={() => {
                          onSelect(place);
                          setOpen(false);
                          setLookup(null);
                        }}
                      >
                        <MapPin size={16} className="shrink-0 text-primary" />
                        <span className="min-w-0">
                          <strong className="block text-xs">
                            {place.name}
                          </strong>
                          <small className="block text-[11px] font-normal text-muted-foreground">
                            {place.context}
                          </small>
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                lookup &&
                !pending && (
                  <p
                    role="status"
                    className="px-2 py-2 text-xs text-muted-foreground"
                  >
                    No matching places. Try a nearby city.
                  </p>
                )
              )}
              <p className="px-2 pt-2 text-[10px] leading-relaxed text-muted-foreground">
                Place searches are sent to Mapbox only when you choose Find a
                place.
              </p>
            </>
          ) : (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Place search needs Mapbox configuration. Lender and offer search
              is available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
