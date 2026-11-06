import type { Point, Projection, Room } from "./types";
type LatLng = { lat: () => number; lng: () => number };
type MapInstance = {
  setCenter: (p: { lat: number; lng: number }) => void;
  getZoom: () => number;
  setZoom: (n: number) => void;
  addListener: (
    event: string,
    fn: (e: { latLng?: LatLng }) => void,
  ) => { remove: () => void };
};
type Overlay = {
  setMap: (map: MapInstance | null) => void;
  getProjection: () => {
    fromLatLngToContainerPixel: (p: unknown) => Point | null;
    fromContainerPixelToLatLng: (p: unknown) => LatLng | null;
  };
  onAdd: () => void;
  onRemove: () => void;
  draw: () => void;
};
type MapsPort = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => MapInstance;
  OverlayView: new () => Overlay;
  LatLng: new (lat: number, lng: number) => unknown;
  Point: new (x: number, y: number) => unknown;
};
let pending: Promise<MapsPort> | null = null;
let authHandler = false;
export function loadGoogleMaps(key: string): Promise<MapsPort> {
  if (!authHandler) {
    authHandler = true;
    const target = window as unknown as { gm_authFailure?: () => void };
    const previous = target.gm_authFailure;
    target.gm_authFailure = () => {
      previous?.();
      window.dispatchEvent(new Event("pixelvault:maps-unavailable"));
    };
  }
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const read = () =>
      (window as unknown as { google?: { maps?: MapsPort } }).google?.maps;
    if (read()) {
      resolve(read()!);
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=quarterly`;
    const timer = window.setTimeout(() => {
      script.remove();
      pending = null;
      reject(new Error("The map took too long to load."));
    }, 12000);
    script.onload = () => {
      clearTimeout(timer);
      const maps = read();
      if (maps) resolve(maps);
      else {
        pending = null;
        reject(new Error("The map could not start."));
      }
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      pending = null;
      reject(new Error("The map could not load."));
    };
    document.head.append(script);
  });
  return pending;
}
export function mountGoogleMap(
  maps: MapsPort,
  el: HTMLElement,
  room: Room,
  onProjection: (p: Projection) => void,
  onDestination: (p: Point) => void,
) {
  const lat = room.area.latitude,
    lng = room.area.longitude;
  const map = new maps.Map(el, {
    center: { lat, lng },
    zoom: 16,
    minZoom: 14,
    maxZoom: 19,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    keyboardShortcuts: false,
    gestureHandling: "greedy",
    clickableIcons: false,
  });
  const overlay = new maps.OverlayView();
  const toLat = (p: Point) =>
    new maps.LatLng(lat + (350 - p.y) * 0.000008, lng + (p.x - 500) * 0.000008);
  const fromLat = (p: LatLng) => ({
    x: (p.lng() - lng) / 0.000008 + 500,
    y: 350 - (p.lat() - lat) / 0.000008,
  });
  overlay.onAdd = () => {};
  overlay.onRemove = () => {};
  overlay.draw = () => {
    const projection = overlay.getProjection();
    if (!projection) return;
    onProjection({
      recenter: (p) =>
        map.setCenter({
          lat: lat + (350 - p.y) * 0.000008,
          lng: lng + (p.x - 500) * 0.000008,
        }),
      toScreen: (p) =>
        projection.fromLatLngToContainerPixel(toLat(p)) || { x: 0, y: 0 },
      toWorld: (p) => {
        const ll = projection.fromContainerPixelToLatLng(
          new maps.Point(p.x, p.y),
        );
        return ll ? fromLat(ll) : { x: 500, y: 350 };
      },
    });
  };
  overlay.setMap(map);
  const click = map.addListener("click", (event) => {
    if (event.latLng) onDestination(fromLat(event.latLng));
  });
  return () => {
    click.remove();
    overlay.setMap(null);
    el.replaceChildren();
  };
}
