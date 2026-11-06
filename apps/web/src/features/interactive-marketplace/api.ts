import { apiRequest, post } from "../../app/api";
import type { Room, Snapshot, Command, Trajectory } from "./types";
export const fetchRooms = (signal?: AbortSignal) =>
  apiRequest<{ rooms: Room[] }>("/plaza/rooms", { signal });
export const joinRoom = (
  slug: string,
  data: { instance_id: string; operation_id: string },
) =>
  post<{ lease: string; snapshot: Snapshot }>(
    `/plaza/rooms/${slug}/join`,
    data,
  );
export const fetchSnapshot = (
  slug: string,
  instance: string,
  signal?: AbortSignal,
) =>
  apiRequest<Snapshot>(`/plaza/rooms/${slug}`, {
    signal,
    headers: { "X-Plaza-Instance": instance },
  });
export const sendCommand = (
  slug: string,
  data: Command & { instance_id: string; lease: string },
) =>
  post<{ recorded: boolean; trajectory?: Trajectory; server_time_ms?: number }>(
    `/plaza/rooms/${slug}/commands`,
    data,
  );
export const reportBubble = (id: string, reason: string) =>
  post(`/plaza/bubbles/${id}/reports`, { reason });
