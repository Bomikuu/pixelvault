import { useEffect, useState } from "react";
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
    full_address?: string;
    place_formatted?: string;
  };
}
export function PlaceSearch({
  token,
  onSelect,
}: {
  token: string;
  onSelect: (place: MapPlace) => void;
}) {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<MapPlace[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const query = value.trim();
    setResults([]);
    setError("");
    setPending(false);
    if (!token || !open || query.length < 2) return;
    if (query.length > 80 || !/^[\p{L}\p{M}\s.'’\-]+$/u.test(query)) {
      setError(
        "Search by city or area name, without street numbers or personal details.",
      );
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPending(true);
      const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
      url.search = new URLSearchParams({
        q: query,
        types: "place,locality,neighborhood",
        country: "ph",
        autocomplete: "true",
        limit: "5",
        language: "en",
        access_token: token,
      }).toString();
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
            "Place search is unavailable. Try again or choose an area below.",
          );
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, token, open, retry]);
  return (
    <div className="discovery-place-search">
      <div className="discovery-place-input">
        <Search size={18} aria-hidden="true" />
        <Input
          aria-label="Search Philippine cities and areas"
          aria-expanded={open && !!results.length}
          aria-controls="discovery-place-results"
          autoComplete="off"
          value={value}
          disabled={!token}
          placeholder={
            token
              ? "Search a city or area"
              : "Place search needs Mapbox configuration"
          }
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
        {pending ? (
          <Loader2 className="spin" size={17} aria-label="Searching areas" />
        ) : (
          value && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear place search"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
            >
              <X size={15} />
            </Button>
          )
        )}
      </div>
      {open &&
        (error ||
          results.length > 0 ||
          (!pending && value.trim().length >= 2 && token)) && (
          <div className="discovery-place-results" id="discovery-place-results">
            {error ? (
              <div role="alert">
                <p>{error}</p>
                {error.startsWith("Place search") && (
                  <Button
                    variant="ghost"
                    onClick={() => setRetry((current) => current + 1)}
                  >
                    Try place search again
                  </Button>
                )}
              </div>
            ) : results.length ? (
              <ul aria-label="Matching Philippine areas">
                {results.map((place) => (
                  <li key={place.id}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onSelect(place);
                        setValue(place.name);
                        setOpen(false);
                      }}
                      aria-label={`Show ${place.name} on map`}
                    >
                      <MapPin size={17} />
                      <span>
                        <strong>{place.name}</strong>
                        <small>{place.context}</small>
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              !pending && (
                <p role="status">No matching areas. Try a nearby city.</p>
              )
            )}
            <small>
              City and neighborhood names only. Search is provided by Mapbox.
            </small>
          </div>
        )}
    </div>
  );
}
