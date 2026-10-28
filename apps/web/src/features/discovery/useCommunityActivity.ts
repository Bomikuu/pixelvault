import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../app/api";
import type { ActivitySnapshot } from "./types";
export type StreamStatus = "connecting" | "live" | "fallback" | "paused";
export function useCommunityActivity() {
  const client = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [generation, setGeneration] = useState(0);
  const [snapshot, setSnapshot] = useState<ActivitySnapshot | null>(null);
  const [pendingRevision, setPendingRevision] = useState<string | null>(null);
  const revision = useRef<string | null>(null);
  const observedRevision = useRef<string | null>(null);
  const activity = useQuery({
    queryKey: ["community-activity"],
    queryFn: () => apiRequest<ActivitySnapshot>("/community/activity"),
    refetchOnWindowFocus: false,
    refetchInterval: status === "fallback" ? 60_000 : false,
    refetchIntervalInBackground: false,
    retry: 1,
  });
  useEffect(() => {
    if (
      !activity.data ||
      !Array.isArray(activity.data.posts) ||
      typeof activity.data.revision !== "string"
    )
      return;
    if (!revision.current) {
      revision.current = activity.data.revision;
      setSnapshot(activity.data);
      if (
        observedRevision.current &&
        observedRevision.current !== activity.data.revision
      )
        setPendingRevision(observedRevision.current);
    } else if (activity.data.revision !== revision.current)
      setPendingRevision(activity.data.revision);
  }, [activity.data]);
  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimer: number | undefined;
    let failures = 0;
    let disposed = false;
    const close = () => {
      window.clearTimeout(reconnectTimer);
      source?.close();
      source = null;
    };
    function connect() {
      close();
      if (disposed) return;
      if (document.hidden) {
        setStatus("paused");
        return;
      }
      if (typeof EventSource === "undefined" || !navigator.onLine) {
        setStatus("fallback");
        return;
      }
      setStatus("connecting");
      try {
        source = new EventSource("/api/v1/community/activity/stream", {
          withCredentials: true,
        });
      } catch {
        setStatus("fallback");
        return;
      }
      const refresh = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as { revision?: unknown };
          if (typeof data.revision !== "string") return;
          observedRevision.current = data.revision;
          if (revision.current && data.revision !== revision.current)
            setPendingRevision(data.revision);
          // Refresh only the revision snapshot. Offers stay put until the reader applies it.
          if (!revision.current || data.revision !== revision.current)
            void client.invalidateQueries({ queryKey: ["community-activity"] });
        } catch {
          /* A malformed event cannot mutate the visible feed. */
        }
      };
      source.addEventListener("ready", (event) => {
        failures = 0;
        setStatus("live");
        refresh(event as MessageEvent);
      });
      source.addEventListener("offers.changed", (event) =>
        refresh(event as MessageEvent),
      );
      const unavailable = () => {
        close();
        if (disposed) return;
        setStatus("fallback");
        failures += 1;
        if (failures <= 3)
          reconnectTimer = window.setTimeout(connect, 3000 * failures);
      };
      source.onerror = unavailable;
      source.addEventListener("stream.unavailable", unavailable);
    }
    const visibility = () => {
      failures = 0;
      connect();
    };
    const online = () => {
      failures = 0;
      connect();
    };
    const offline = () => {
      close();
      setStatus("fallback");
    };
    connect();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      disposed = true;
      close();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [client, generation]);
  const applyUpdates = useCallback(async () => {
    const fresh = await activity.refetch();
    if (!fresh.isSuccess) return;
    if (fresh.data && Array.isArray(fresh.data.posts)) {
      revision.current = fresh.data.revision;
      setSnapshot(fresh.data);
      setPendingRevision(null);
    }
    await client.invalidateQueries({ queryKey: ["offers"] });
  }, [activity.refetch, client]);
  return {
    ...activity,
    snapshot,
    hasUpdates: !!pendingRevision,
    status,
    applyUpdates,
    reconnect: () => setGeneration((current) => current + 1),
  };
}
