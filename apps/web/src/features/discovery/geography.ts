import type { CoarseArea, MapPlace } from "./types";

export const DEFAULT_PLACE: MapPlace = {
  id: "quezon-city",
  name: "Quezon City",
  context: "Metro Manila, Philippines",
  center: [121.0437, 14.676],
};
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (value: number) => (value * 180) / Math.PI;
const EARTH_KM = 6371.0088;

export function publicAreaCenter(area?: CoarseArea): [number, number] | null {
  if (
    area?.approximate !== true ||
    !Number.isFinite(area.latitude) ||
    !Number.isFinite(area.longitude)
  )
    return null;
  const latitude = Number(area.latitude),
    longitude = Number(area.longitude);
  return latitude >= 4 && latitude <= 22 && longitude >= 116 && longitude <= 127
    ? [longitude, latitude]
    : null;
}

export function distanceKm(from: [number, number], to: [number, number]) {
  const lat = radians(to[1] - from[1]),
    lng = radians(to[0] - from[0]);
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(from[1])) *
      Math.cos(radians(to[1])) *
      Math.sin(lng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function radiusPolygon(center: [number, number], km: number) {
  const longitude = radians(center[0]),
    latitude = radians(center[1]),
    distance = km / EARTH_KM;
  const ring = Array.from({ length: 97 }, (_, index) => {
    const bearing = ((index % 96) * Math.PI * 2) / 96;
    const lat = Math.asin(
      Math.sin(latitude) * Math.cos(distance) +
        Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing),
    );
    const lng =
      longitude +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude),
        Math.cos(distance) - Math.sin(latitude) * Math.sin(lat),
      );
    return [degrees(lng), degrees(lat)];
  });
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [ring] },
  };
}

export type MapAction = "zoom-in" | "zoom-out" | "reset" | "retry";
