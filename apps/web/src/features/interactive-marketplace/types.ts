import type { ApiSchemas } from "@pixelvault/contracts";
type S = ApiSchemas["schemas"];
export type Room = S["PlazaRoom"] & { online?: number };
export type Snapshot = S["PlazaSnapshot"];
export type Participant = S["PlazaParticipant"];
export type Bubble = S["PlazaBubble"];
export type Trajectory = S["PlazaTrajectory"];
export type Point = S["PlazaPoint"];
export type OfferEntry = Snapshot["offers"][number];
export type Direction = "up" | "down" | "left" | "right";
export type Projection = {
  toScreen: (p: Point) => Point;
  toWorld: (p: Point) => Point;
  recenter?: (p: Point) => void;
};
export type Command = {
  action: "heartbeat" | "move" | "stop" | "bubble" | "clear_bubble" | "leave";
  sequence?: number;
  target?: Point;
  body?: string;
  offer_id?: string | null;
  operation_id?: string;
};
