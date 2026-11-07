import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import mapboxgl, { type GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Button,
  DEFAULT_PLACE,
  PlaceSearch,
  distanceKm,
  publicAreaCenter,
  radiusPolygon,
  type MapPlace,
} from "@pixelvault/ui";
import {
  ArrowLeft,
  LocateFixed,
  Minus,
  Plus,
  List,
  ChevronDown,
} from "lucide-react";
import {
  Action,
  Empty,
  ErrorState,
  IconButton,
  Loading,
  PersonAvatar,
  Note,
} from "../../components/ui";
import { mapToken, useDiscovery } from "./data";
import { OfferCard } from "./OfferCard";
export function MapScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial: MapPlace = (() => {
    const lng = Number(params.get("lng")),
      lat = Number(params.get("lat"));
    return params.has("lng") &&
      Number.isFinite(lng) &&
      lng >= 116 &&
      lng <= 127 &&
      Number.isFinite(lat) &&
      lat >= 4 &&
      lat <= 22
      ? {
          id: "selected-place",
          name: params.get("place") || "Selected area",
          context: "Philippines",
          center: [lng, lat],
        }
      : DEFAULT_PLACE;
  })();
  const [place, setPlace] = useState(initial),
    [radius, setRadius] = useState(10),
    [selected, setSelected] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [mapFailed, setMapFailed] = useState(!mapToken()),
    [collapsed, setCollapsed] = useState(false);
  const container = useRef<HTMLDivElement>(null),
    map = useRef<mapboxgl.Map | null>(null);
  const markerRoots = useRef<Root[]>([]);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const discovery = useDiscovery();
  const all = discovery.data?.pages.flatMap((page) => page.offers) || [];
  const offers = all.filter((offer) => {
    const center = publicAreaCenter(offer.area);
    return (
      center &&
      distanceKm(place.center, center) <= radius &&
      `${offer.title} ${offer.lender.display_name} ${offer.area.name}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  useEffect(() => {
    if (!container.current || !mapToken()) return;
    let instance: mapboxgl.Map;
    try {
      instance = new mapboxgl.Map({
        container: container.current,
        accessToken: mapToken(),
        style: document.documentElement.classList.contains("dark")
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/light-v11",
        center: place.center,
        zoom: 10.5,
        attributionControl: true,
      });
      map.current = instance;
      instance.on("error", () => setMapFailed(true));
      instance.on("load", () => setMapFailed(false));
    } catch {
      setMapFailed(true);
      return;
    }
    return () => {
      markers.current.forEach((marker) => marker.remove());
      markerRoots.current.forEach((root) => root.unmount());
      markers.current = [];
      markerRoots.current = [];
      map.current = null;
      instance.remove();
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    let cancelled = false;
    const update = () => {
      if (cancelled) return;
      const data = radiusPolygon(place.center, radius);
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      const source = instance.getSource("proximity") as
        GeoJSONSource | undefined;
      if (source) source.setData(data);
      else {
        instance.addSource("proximity", { type: "geojson", data });
        instance.addLayer({
          id: "proximity-area",
          type: "fill",
          source: "proximity",
          paint: { "fill-color": color, "fill-opacity": 0.09 },
        });
        instance.addLayer({
          id: "proximity-edge",
          type: "line",
          source: "proximity",
          paint: {
            "line-color": color,
            "line-width": 2,
            "line-dasharray": [3, 2],
          },
        });
      }
      instance.easeTo({
        center: place.center,
        zoom: radius === 5 ? 11.5 : radius === 10 ? 10.5 : 8.4,
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 350,
      });
    };
    if (instance.isStyleLoaded()) update();
    else instance.once("load", update);
    return () => {
      cancelled = true;
      instance.off("load", update);
    };
  }, [place, radius]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    markers.current.forEach((marker) => marker.remove());
    markerRoots.current.forEach((root) => root.unmount());
    markers.current = [];
    markerRoots.current = [];
    offers.forEach((offer, index) => {
      const center = publicAreaCenter(offer.area);
      if (!center) return;
      const holder = document.createElement("div");
      const root = createRoot(holder);
      root.render(
        <Button
          variant={selected === offer.id ? "default" : "outline"}
          aria-label={`View ${offer.lender.display_name}'s offer`}
          aria-pressed={selected === offer.id}
          className={`h-auto! rounded-full! p-1! shadow-sm ${selected === offer.id ? "scale-110 ring-4 ring-primary/25" : ""}`}
          onClick={() => {
            setSelected(offer.id);
            document.getElementById(`map-offer-${offer.id}`)?.scrollIntoView({
              block: "nearest",
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
            });
          }}
        >
          <PersonAvatar person={offer.lender} size={40} />
        </Button>,
      );
      const count = offers.filter(
        (row) => row.area.name === offer.area.name,
      ).length;
      const offset =
        count > 1
          ? [
              ((index % 3) - 1) * 0.006,
              ((Math.floor(index / 3) % 3) - 1) * 0.006,
            ]
          : [0, 0];
      markers.current.push(
        new mapboxgl.Marker({ element: holder })
          .setLngLat([center[0] + offset[0], center[1] + offset[1]])
          .addTo(instance),
      );
      markerRoots.current.push(root);
    });
  }, [discovery.data, place, radius, query, selected]);
  if (mapFailed)
    return (
      <div className="min-h-dvh px-5 pt-5">
        <Button variant="ghost" onClick={() => navigate("/explore")}>
          <ArrowLeft />
          Back to offers
        </Button>
        <Empty
          title="The map isn’t available here."
          action={
            <Action to="/explore">
              <List />
              Browse all offers
            </Action>
          }
        >
          You can still explore every available offer in the list. No location
          permission is required.
        </Empty>
      </div>
    );
  return (
    <main className="relative h-dvh overflow-clip">
      <div
        ref={container}
        className="absolute inset-0"
        aria-label="Approximate lending offer map"
      />
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 left-4 z-10 space-y-2">
        <div className="flex gap-2">
          <IconButton
            label="Back to list"
            variant="outline"
            onClick={() => navigate("/explore")}
          >
            <ArrowLeft />
          </IconButton>
          <div className="min-w-0 flex-1 rounded-xl bg-card [&_input]:text-base!">
            <PlaceSearch
              token={mapToken()}
              value={query}
              onChange={setQuery}
              onSelect={(next) => {
                setPlace(next);
                setQuery("");
              }}
            />
          </div>
        </div>
        <div
          className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1"
          role="group"
          aria-label="Approximate proximity"
        >
          {[5, 10, 50].map((km) => (
            <Button
              key={km}
              variant={radius === km ? "secondary" : "ghost"}
              className="min-h-11 flex-1 text-xs"
              aria-pressed={radius === km}
              onClick={() => setRadius(km)}
            >
              Within {km} km
            </Button>
          ))}
          <IconButton
            label="Search near me"
            onClick={() => {
              if (!navigator.geolocation) {
                setError("Location is unavailable. Choose a city instead.");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const center: [number, number] = [
                    position.coords.longitude,
                    position.coords.latitude,
                  ];
                  if (
                    center[0] < 116 ||
                    center[0] > 127 ||
                    center[1] < 4 ||
                    center[1] > 22
                  ) {
                    setError(
                      "Choose a Philippine city to browse nearby offers.",
                    );
                    return;
                  }
                  setPlace({
                    id: "nearby",
                    name: "Your approximate area",
                    context: "Philippines",
                    center,
                  });
                  setError("");
                },
                () =>
                  setError(
                    "Location was not shared. Search for a city instead.",
                  ),
                {
                  enableHighAccuracy: false,
                  maximumAge: 300000,
                  timeout: 10000,
                },
              );
            }}
          >
            <LocateFixed className="size-4" />
          </IconButton>
        </div>
        {error && <Note danger>{error}</Note>}
      </div>
      <div className="absolute top-48 right-4 z-10 flex flex-col rounded-xl border border-border bg-card">
        <IconButton label="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Plus />
        </IconButton>
        <IconButton label="Zoom out" onClick={() => map.current?.zoomOut()}>
          <Minus />
        </IconButton>
      </div>
      <section className="absolute right-3 bottom-[max(2rem,env(safe-area-inset-bottom))] left-3 z-10 mx-auto max-w-lg rounded-2xl border border-border bg-card p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-sm font-bold">
              {offers.length} nearby loaded offers
            </h1>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Around {place.name}. Pins use approximate city centers.
            </p>
          </div>
          <IconButton
            label={collapsed ? "Show nearby offers" : "Collapse nearby offers"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronDown
              className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </IconButton>
        </div>
        {!collapsed && (
          <div className="mt-3 max-h-[36dvh] space-y-2 overflow-y-auto overscroll-contain pr-1">
            {discovery.isPending ? (
              <Loading />
            ) : discovery.error ? (
              <ErrorState error={discovery.error} />
            ) : offers.length ? (
              offers.map((offer) => (
                <div id={`map-offer-${offer.id}`} key={offer.id}>
                  <OfferCard
                    offer={offer}
                    compact
                    onFocus={() => setSelected(offer.id)}
                  />
                </div>
              ))
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                No loaded offers in this radius. Try a wider area.
              </p>
            )}
            {discovery.hasNextPage && (
              <Button
                variant="outline"
                className="w-full"
                disabled={discovery.isFetchingNextPage}
                onClick={() => void discovery.fetchNextPage()}
              >
                Load more nearby offers
              </Button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
