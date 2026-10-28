import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { Button } from "@pixelvault/ui";
import { MapPin, RefreshCw, WifiOff } from "lucide-react";
import { MemberAvatar } from "../../components";
import type { DiscoveryOffer, MapPlace } from "./types";
import "mapbox-gl/dist/mapbox-gl.css";
interface OfferGroup {
  key: string;
  center: [number, number];
  name: string;
  offers: DiscoveryOffer[];
}
export function groupAreaOffers(offers: DiscoveryOffer[]): OfferGroup[] {
  const groups: OfferGroup[] = [];
  for (const offer of offers) {
    const area = offer.coarseArea;
    if (
      !area ||
      area.approximate !== true ||
      !Number.isFinite(area.latitude) ||
      !Number.isFinite(area.longitude)
    )
      continue;
    const latitude = Number(area.latitude),
      longitude = Number(area.longitude);
    if (latitude < 4 || latitude > 22 || longitude < 116 || longitude > 127)
      continue;
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
  onSelect,
  place,
}: {
  token: string;
  offers: DiscoveryOffer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  place: MapPlace | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const markers = useRef<MapboxMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
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
          center: [121.03, 14.62],
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
        instance.addControl(
          new mapbox.NavigationControl({ showCompass: false }),
          "bottom-right",
        );
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
    if (ready && map.current && place)
      map.current.flyTo({
        center: place.center,
        zoom: 11,
        duration: reducedMotion() ? 0 : 650,
        essential: false,
      });
  }, [place, ready]);
  return (
    <div
      className="discovery-map"
      aria-label="Map of approximate lending areas"
    >
      <div ref={container} className="discovery-map-canvas" />
      {!token ? (
        <div className="discovery-map-state">
          <MapPin size={32} />
          <h2>Map setup is still needed.</h2>
          <p>
            A Mapbox public token has not been configured for this app. You can
            compare every loaded offer in the list.
          </p>
        </div>
      ) : error ? (
        <div className="discovery-map-state" role="alert">
          <WifiOff size={28} />
          <h2>The map is unavailable.</h2>
          <p>{error}</p>
          <Button
            variant="outline"
            onClick={() => setAttempt((current) => current + 1)}
          >
            <RefreshCw size={15} />
            Retry map
          </Button>
        </div>
      ) : !ready ? (
        <div className="discovery-map-loading" role="status">
          Loading the community map…
        </div>
      ) : null}
      <div className="discovery-map-privacy">
        <MapPin size={14} />
        <span>City and area centers · never home locations</span>
      </div>
      {ready &&
        groups.map((group) => {
          const representative =
            group.offers.find((offer) => offer.id === selectedId) ||
            group.offers[0];
          return createPortal(
            <Button
              className={`discovery-person-marker ${group.offers.some((offer) => offer.id === selectedId) ? "is-selected" : ""}`}
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
