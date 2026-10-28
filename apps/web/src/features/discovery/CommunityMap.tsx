import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  Map as MapboxMap,
  Marker as MapboxMarker,
  GeoJSONSource,
} from "mapbox-gl";
import { Button } from "@pixelvault/ui";
import { MapPin, WifiOff } from "lucide-react";
import { MapControls } from "./MapControls";
import { MemberAvatar } from "../../components";
import type { DiscoveryOffer, MapPlace } from "./types";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  DEFAULT_PLACE,
  publicAreaCenter,
  radiusPolygon,
  type MapAction,
} from "./geography";
interface OfferGroup {
  key: string;
  center: [number, number];
  name: string;
  offers: DiscoveryOffer[];
}
export function groupAreaOffers(offers: DiscoveryOffer[]): OfferGroup[] {
  const groups: OfferGroup[] = [];
  for (const offer of offers) {
    const center = publicAreaCenter(offer.coarseArea);
    if (!center) continue;
    const [longitude, latitude] = center;
    const area = offer.coarseArea!;
    // Group nearby public centroids; never jitter a member into a fabricated street position.
    const group = groups.find(
      (item) =>
        Math.hypot(
          (item.center[0] - longitude) * 108,
          (item.center[1] - latitude) * 111,
        ) < 1.5,
    );
    if (group) group.offers.push(offer);
    else
      groups.push({
        key: area.code || `${longitude},${latitude}`,
        center: [longitude, latitude],
        name: area.name,
        offers: [offer],
      });
  }
  return groups;
}
const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
export function CommunityMap({
  token,
  offers,
  selectedId,
  highlightedId = null,
  radiusKm = 0,
  locating = false,
  onLocate,
  onReadyChange,
  onSelect,
  place,
}: {
  token: string;
  offers: DiscoveryOffer[];
  selectedId: string | null;
  highlightedId?: string | null;
  radiusKm?: number;
  locating?: boolean;
  onLocate?: () => void;
  onReadyChange?: (ready: boolean) => void;
  onSelect: (id: string) => void;
  place: MapPlace | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const markers = useRef<MapboxMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    onReadyChange?.(ready && !error);
    return () => onReadyChange?.(false);
  }, [ready, error, onReadyChange]);
  const groups = useMemo(
    () =>
      groupAreaOffers(offers).map((group) => ({
        ...group,
        element: document.createElement("div"),
      })),
    [offers],
  );
  useEffect(() => {
    if (!token || !container.current) return;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    setReady(false);
    setError("");
    const offline = () =>
      setError(
        "You’re offline. Reconnect and retry the map; the offer list stays available.",
      );
    window.addEventListener("offline", offline);
    async function initialize() {
      if (!navigator.onLine) {
        offline();
        return;
      }
      try {
        const { default: mapbox } = await import("mapbox-gl");
        if (disposed || !container.current) return;
        if (!mapbox.supported()) {
          setError(
            "This browser cannot display the interactive map. Use the complete list, or try a browser with WebGL enabled.",
          );
          return;
        }
        const instance = new mapbox.Map({
          container: container.current,
          accessToken: token,
          style: "mapbox://styles/mapbox/standard",
          center: DEFAULT_PLACE.center,
          zoom: 10.3,
          minZoom: 4.5,
          maxZoom: 14,
          maxBounds: [
            [116, 4],
            [127, 22],
          ],
          projection: "mercator",
          renderWorldCopies: false,
          attributionControl: true,
        });
        map.current = instance;
        instance.on("load", () => {
          if (!disposed) {
            setReady(true);
            setError("");
          }
        });
        instance.on("error", (event) => {
          if (disposed) return;
          const message = event.error?.message || "";
          setError(
            /401|403|unauthorized|token/i.test(message)
              ? "The map could not authorize this site. The Mapbox public token or allowed website needs updating."
              : "Map tiles could not load. Check your connection and retry, or use the complete offer list.",
          );
        });
        instance.on("webglcontextlost", () => {
          if (!disposed)
            setError(
              "The browser lost its map graphics connection. Retry the map or use the complete list.",
            );
        });
        observer = new ResizeObserver(() => instance.resize());
        observer.observe(container.current);
      } catch {
        if (!disposed)
          setError(
            "The interactive map could not start. Retry, or continue with the complete offer list.",
          );
      }
    }
    void initialize();
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("offline", offline);
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [token, attempt]);
  useEffect(() => {
    if (!ready || !map.current) return;
    let disposed = false;
    void import("mapbox-gl").then(({ default: mapbox }) => {
      if (disposed || !map.current) return;
      markers.current.forEach((marker) => marker.remove());
      markers.current = groups.map((group) =>
        new mapbox.Marker({ element: group.element, anchor: "bottom" })
          .setLngLat(group.center)
          .addTo(map.current!),
      );
    });
    return () => {
      disposed = true;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
    };
  }, [groups, ready]);
  useEffect(() => {
    if (!ready || !map.current || !selectedId) return;
    const group = groups.find((item) =>
      item.offers.some((offer) => offer.id === selectedId),
    );
    if (group)
      map.current.flyTo({
        center: group.center,
        zoom: 11.5,
        duration: reducedMotion() ? 0 : 650,
        essential: false,
      });
  }, [selectedId, groups, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current;
    const center = (place ?? DEFAULT_PLACE).center;
    const data = radiusKm
      ? radiusPolygon(center, radiusKm)
      : { type: "FeatureCollection" as const, features: [] };
    const source = instance.getSource("explore-radius") as
      GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      instance.addSource("explore-radius", { type: "geojson", data });
      instance.addLayer({
        id: "explore-radius-fill",
        type: "fill",
        source: "explore-radius",
        slot: "middle",
        paint: { "fill-color": "#0866ff", "fill-opacity": 0.1 },
      });
      instance.addLayer({
        id: "explore-radius-outline",
        type: "line",
        source: "explore-radius",
        slot: "middle",
        paint: {
          "line-color": "#0866ff",
          "line-width": 2,
          "line-dasharray": [3, 2],
        },
      });
    }
    const origin = radiusKm
      ? {
          type: "Feature" as const,
          properties: {},
          geometry: { type: "Point" as const, coordinates: center },
        }
      : { type: "FeatureCollection" as const, features: [] };
    const originSource = instance.getSource("explore-origin") as
      GeoJSONSource | undefined;
    if (originSource) originSource.setData(origin);
    else {
      instance.addSource("explore-origin", { type: "geojson", data: origin });
      instance.addLayer({
        id: "explore-origin-dot",
        type: "circle",
        source: "explore-origin",
        slot: "top",
        paint: {
          "circle-radius": 6,
          "circle-color": "#0866ff",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
    }
    fitSearchArea();
    function fitSearchArea() {
      if (radiusKm) {
        const ring = radiusPolygon(center, radiusKm).geometry.coordinates[0];
        instance.fitBounds(
          [
            [
              Math.min(...ring.map((p) => p[0])),
              Math.min(...ring.map((p) => p[1])),
            ],
            [
              Math.max(...ring.map((p) => p[0])),
              Math.max(...ring.map((p) => p[1])),
            ],
          ],
          { padding: 48, duration: reducedMotion() ? 0 : 650, maxZoom: 12 },
        );
      } else if (place)
        instance.flyTo({
          center,
          zoom: 11,
          duration: reducedMotion() ? 0 : 650,
          essential: false,
        });
    }
  }, [place, radiusKm, ready]);
  function runCommand(action: MapAction) {
    if (action === "retry") {
      setAttempt((current) => current + 1);
      return;
    }
    if (!ready || !map.current) return;
    const instance = map.current;
    const options = { duration: reducedMotion() ? 0 : 300 };
    if (action === "zoom-in") instance.zoomIn(options);
    else if (action === "zoom-out") instance.zoomOut(options);
    else {
      const center = (place ?? DEFAULT_PLACE).center;
      if (radiusKm) {
        const ring = radiusPolygon(center, radiusKm).geometry.coordinates[0];
        instance.fitBounds(
          [
            [
              Math.min(...ring.map((p) => p[0])),
              Math.min(...ring.map((p) => p[1])),
            ],
            [
              Math.max(...ring.map((p) => p[0])),
              Math.max(...ring.map((p) => p[1])),
            ],
          ],
          { padding: 48, maxZoom: 12, ...options },
        );
      } else instance.flyTo({ center, zoom: 10.3, ...options });
    }
  }
  return (
    <div
      className="discovery-map"
      aria-label="Map of approximate lending areas"
    >
      <div ref={container} className="discovery-map-canvas" />
      {!token ? (
        <div className="discovery-map-state max-lg:justify-start! max-lg:pt-3! max-lg:[&>svg]:mb-2! max-lg:[&>svg]:size-5! max-lg:[&>h2]:mb-1! max-lg:[&>h2]:text-base! max-lg:[&>p]:text-[11px]! max-lg:[&>p]:leading-relaxed!">
          <MapPin size={32} />
          <h2>Map setup is still needed.</h2>
          <p>
            A Mapbox public token has not been configured for this app. You can
            compare every loaded offer in the list.
          </p>
        </div>
      ) : error ? (
        <div
          className="discovery-map-state max-lg:justify-start! max-lg:pt-3! max-lg:[&>svg]:mb-2! max-lg:[&>svg]:size-5! max-lg:[&>h2]:mb-1! max-lg:[&>h2]:text-base! max-lg:[&>p]:text-[11px]! max-lg:[&>p]:leading-relaxed!"
          role="alert"
        >
          <WifiOff size={28} />
          <h2>The map is unavailable.</h2>
          <p>{error}</p>
          <p className="mt-3 hidden lg:block">
            Retry using the map controls, or switch to the list.
          </p>
        </div>
      ) : !ready ? (
        <div className="discovery-map-loading" role="status">
          Loading the community map…
        </div>
      ) : null}
      <MapControls
        ready={ready && !error}
        locating={locating}
        locate={onLocate}
        command={runCommand}
      />
      <div className="discovery-map-privacy hidden! lg:flex!">
        <MapPin size={14} />
        <span>City and area centers · never home locations</span>
      </div>
      {ready &&
        groups.map((group) => {
          const highlighted = group.offers.some(
            (offer) => offer.id === highlightedId,
          );
          group.element.style.zIndex = highlighted
            ? "5"
            : group.offers.some((offer) => offer.id === selectedId)
              ? "4"
              : "1";
          const representative =
            group.offers.find((offer) => offer.id === highlightedId) ||
            group.offers.find((offer) => offer.id === selectedId) ||
            group.offers[0];
          return createPortal(
            <Button
              className={`discovery-person-marker origin-bottom transition-[transform,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${highlighted ? "scale-110 border-primary! shadow-lg! ring-4 ring-primary/25" : ""} ${group.offers.some((offer) => offer.id === selectedId) ? "is-selected" : ""}`}
              data-highlighted={highlighted || undefined}
              variant="outline"
              aria-label={`Explore ${group.offers.length} ${group.offers.length === 1 ? "offer" : "offers"} near ${group.name}`}
              aria-pressed={group.offers.some(
                (offer) => offer.id === selectedId,
              )}
              onClick={() => onSelect(representative.id)}
            >
              <MemberAvatar
                name={representative.lender.display_name}
                avatarKey={representative.lender.avatar_key}
                photoUrl={representative.lender.photo_url}
                reputation={representative.lender.reputation}
                size={42}
              />
              <span>
                <strong>
                  {group.offers.length === 1
                    ? representative.lender.display_name.split(" ")[0]
                    : `${group.offers.length} offers`}
                </strong>
                <small>{group.name}</small>
              </span>
              {group.offers.length > 1 && (
                <span className="discovery-marker-count">
                  {group.offers.length}
                </span>
              )}
            </Button>,
            group.element,
            group.key,
          );
        })}
    </div>
  );
}
