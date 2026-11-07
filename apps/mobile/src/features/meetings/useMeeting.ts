import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Meeting } from "@pixelvault/contracts";
import { api, ApiError, operationId, post } from "../../app/api";
import { useMemberQuery, useSession } from "../../app/session";
export function useMeeting(id: string, mode: "lobby" | "room" | "record") {
  const cache = useQueryClient(),
    { session, refresh } = useSession();
  const key = ["member", session?.member?.id, "meeting", id];
  const query = useMemberQuery<Meeting>(["meeting", id], `/meetings/${id}`, {
    interval: 5000,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [connection, setConnection] = useState("Connecting");
  const pending = useRef<{ identity: string; body: string } | null>(null),
    lock = useRef(false);
  const self = query.data?.participants.find(
    (p) => p.id === session?.member?.id,
  );
  useEffect(() => {
    if (!id || !session?.member) return;
    let source: EventSource | null = null;
    const start = () => {
      source?.close();
      if (document.hidden) return;
      source = new EventSource(`/api/v1/meetings/${id}/stream`, {
        withCredentials: true,
      });
      source.onopen = () => setConnection("Live");
      source.onerror = () => setConnection("Reconnecting");
      source.addEventListener("room.changed", () => void query.refetch());
      source.addEventListener("room.expired", () => {
        source?.close();
        cache.removeQueries({ queryKey: ["member"] });
        void refresh();
      });
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      source?.close();
      document.removeEventListener("visibilitychange", start);
    };
  }, [id, session?.member?.id]);
  const attendanceWindow =
    !!query.data?.scheduled_at &&
    Math.abs(
      Date.parse(query.data.scheduled_at) - Date.parse(query.data.server_time),
    ) <= 3600000;
  useEffect(() => {
    if (mode === "record" || !query.data || query.data.state === "closed")
      return;
    if (mode === "room" && (!self?.checked_in || !attendanceWindow)) return;
    const renew = () => {
      if (!document.hidden && navigator.onLine)
        void post(`/meetings/${id}`, {
          action: mode === "room" ? "heartbeat" : "lobby_heartbeat",
          operation_id: operationId(),
        }).catch(() => setConnection("Reconnecting"));
    };
    renew();
    const timer = setInterval(renew, 15000);
    return () => clearInterval(timer);
  }, [id, mode, self?.checked_in, query.data?.state, attendanceWindow]);
  useEffect(() => {
    const latest = query.data?.messages.at(-1);
    if (mode === "lobby" || !latest || document.hidden) return;
    void post(`/hub/threads/${query.data!.thread_id}/read`, {
      through: latest.created_at,
    }).catch(() => {});
  }, [query.data?.messages.at(-1)?.id, mode]);
  const act = useCallback(
    async (data: Record<string, unknown>) => {
      if (lock.current)
        throw new Error("Wait for the current action to finish.");
      if (!navigator.onLine)
        throw new Error("Reconnect before changing this room.");
      lock.current = true;
      setBusy(true);
      setError(null);
      const identity = JSON.stringify([id, session?.member?.id, data]);
      if (pending.current?.identity !== identity)
        pending.current = {
          identity,
          body: JSON.stringify({
            ...data,
            expected_revision: query.data?.revision,
            operation_id: operationId(),
          }),
        };
      try {
        const result = await api<Meeting>(`/meetings/${id}`, {
          method: "POST",
          body: pending.current.body,
        });
        pending.current = null;
        cache.setQueryData(key, result);
        return result;
      } catch (e) {
        setError(e);
        if (e instanceof ApiError && e.status > 0 && e.status < 500)
          pending.current = null;
        await query.refetch();
        throw e;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [id, session?.member?.id, query.data?.revision],
  );
  return { ...query, act, busy, actionError: error, connection, self };
}
