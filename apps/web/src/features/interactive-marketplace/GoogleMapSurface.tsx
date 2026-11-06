import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, mountGoogleMap } from "./googleMaps";
import type { Room, Projection, Point } from "./types";
export function GoogleMapSurface({
  room,
  onProjection,
  onDestination,
  onReady,
  attempt,
}: {
  room: Room;
  onProjection: (p: Projection) => void;
  onDestination: (p: Point) => void;
  onReady: (ready: boolean) => void;
  attempt: number;
}) {
  const el = useRef<HTMLDivElement>(null),
    latest = useRef({ onProjection, onDestination, onReady });
  latest.current = { onProjection, onDestination, onReady };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const key = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "");
    let disposed = false,
      cleanup: (() => void) | undefined;
    latest.current.onReady(false);
    setFailed(!key);
    const fail = () => {
      if (!disposed) {
        cleanup?.();
        cleanup = undefined;
        setFailed(true);
        latest.current.onReady(false);
      }
    };
    window.addEventListener("pixelvault:maps-unavailable", fail);
    if (key && el.current)
      void loadGoogleMaps(key)
        .then((maps) => {
          if (disposed || !el.current) return;
          cleanup = mountGoogleMap(
            maps,
            el.current,
            room,
            (p) => {
              latest.current.onProjection(p);
              latest.current.onReady(true);
            },
            (p) => latest.current.onDestination(p),
          );
        })
        .catch(fail);
    return () => {
      disposed = true;
      window.removeEventListener("pixelvault:maps-unavailable", fail);
      cleanup?.();
    };
  }, [room.slug, attempt]);
  return (
    <div
      ref={el}
      className={`absolute inset-0 ${failed ? "hidden" : ""}`}
      aria-label="Google Maps city background"
    />
  );
}
