import type { Offer, Person } from "@pixelvault/contracts";
export interface CoarseArea {
  name: string;
  code?: string;
  latitude?: number;
  longitude?: number;
  approximate?: boolean;
  source?: string;
}
export interface DiscoveryOffer extends Offer {
  coarseArea?: CoarseArea;
  created_at?: string;
}
export interface ActivityPost {
  id: string;
  title: string;
  lender: Person;
  area: CoarseArea;
  created_at: string;
}
export interface ActivitySnapshot {
  posts: ActivityPost[];
  revision: string;
}
export interface MapPlace {
  id: string;
  name: string;
  context: string;
  center: [number, number];
}
export const mapboxPublicToken = () => {
  const token = String(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "").trim();
  return token.startsWith("pk.") ? token : "";
};
