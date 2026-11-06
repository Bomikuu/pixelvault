import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "../../app/api";
import { useSession } from "../../app/session";
import {
  fetchRooms,
  fetchSnapshot,
  joinRoom,
  sendCommand,
  reportBubble,
} from "./api";
import type { Snapshot, Command, Point } from "./types";
type Active = { slug: string; lease: string; actor: string };
export function usePlaza() {
  const { session, refresh: refreshSession } = useSession();
  const refreshRef = useRef(refreshSession);
  refreshRef.current = refreshSession;
  const actor = session?.member?.id;
  const identity = useRef(actor);
  identity.current = actor;
  const instance = useRef(crypto.randomUUID());
  const [active, setActive] = useState<Active | null>(null),
    activeRef = useRef<Active | null>(null);
  activeRef.current = active;
  const [record, setRecord] = useState<{
    actor: string;
    data: Snapshot;
  } | null>(null);
  const [status, setStatus] = useState("choosing"),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    generation = useRef(0),
    sequence = useRef(0),
    fetchLock = useRef(false);
  const joinAttempt = useRef<{ key: string; operation_id: string } | null>(
      null,
    ),
    bubbleAttempt = useRef<{ key: string; operation_id: string } | null>(null);
  const rooms = useQuery({
    queryKey: ["plaza-rooms"],
    queryFn: ({ signal }) => fetchRooms(signal),
    refetchInterval: actor ? 15000 : 60000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const failure = useCallback((problem: unknown) => {
    setError(problem);
    if (
      problem instanceof ApiError &&
      (problem.status === 403 ||
        problem.status === 401 ||
        problem.fields.code === "lease_lost")
    ) {
      setStatus(problem.status === 409 ? "controlled_elsewhere" : "expired");
      setActive(null);
      activeRef.current = null;
      setRecord(null);
      joinAttempt.current = null;
      if (problem.status === 401 || problem.status === 403)
        void refreshRef.current();
    } else
      setStatus(
        problem instanceof ApiError &&
          problem.status >= 400 &&
          problem.status < 500 &&
          activeRef.current
          ? "connected"
          : "reconnecting",
      );
  }, []);
  const ingest = useCallback((data: Snapshot, current: Active) => {
    if (
      identity.current !== current.actor ||
      activeRef.current?.lease !== current.lease
    )
      return;
    if (!data.self?.owned) {
      setStatus("controlled_elsewhere");
      setActive(null);
      setRecord(null);
      return;
    }
    sequence.current = Math.max(sequence.current, data.self.sequence);
    setRecord({ actor: current.actor, data });
    setStatus("connected");
    setError(null);
  }, []);
  const reload = useCallback(async () => {
    const current = activeRef.current;
    if (!current || fetchLock.current || document.hidden || !navigator.onLine)
      return;
    fetchLock.current = true;
    const gen = generation.current;
    try {
      const data = await fetchSnapshot(current.slug, instance.current);
      if (gen === generation.current) ingest(data, current);
    } catch (e) {
      if (gen === generation.current) failure(e);
    } finally {
      fetchLock.current = false;
    }
  }, [ingest, failure]);
  const command = useCallback(
    async (data: Command) => {
      const current = activeRef.current;
      if (!current || identity.current !== current.actor || !navigator.onLine)
        throw new Error("Reconnect and join a room before making changes.");
      const gen = generation.current;
      try {
        const result = await sendCommand(current.slug, {
          ...data,
          instance_id: instance.current,
          lease: current.lease,
        });
        if (
          gen !== generation.current ||
          activeRef.current?.lease !== current.lease
        )
          return;
        if (result.trajectory && result.server_time_ms)
          setRecord((old) =>
            old?.actor === current.actor
              ? {
                  actor: old.actor,
                  data: {
                    ...old.data,
                    server_time_ms: result.server_time_ms!,
                    participants: old.data.participants.map((p) =>
                      p.participant_id === old.data.self?.participant_id
                        ? { ...p, trajectory: result.trajectory! }
                        : p,
                    ),
                  },
                }
              : old,
          );
        return result;
      } catch (e) {
        if (
          gen === generation.current &&
          !(
            e instanceof ApiError &&
            ["stale_sequence", "rate_limited"].includes(String(e.fields.code))
          )
        )
          failure(e);
        throw e;
      }
    },
    [failure],
  );
  const join = async (slug: string) => {
    if (lock.current || !actor) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const key = `${actor}:${slug}`;
    if (joinAttempt.current?.key !== key)
      joinAttempt.current = { key, operation_id: crypto.randomUUID() };
    const gen = generation.current;
    try {
      const result = await joinRoom(slug, {
        instance_id: instance.current,
        operation_id: joinAttempt.current.operation_id,
      });
      if (gen !== generation.current || identity.current !== actor) return;
      // A late response from the previous lease must never clear this new one.
      generation.current++;
      const next = { slug, lease: result.lease, actor };
      activeRef.current = next;
      sequence.current = result.snapshot.self?.sequence || 0;
      setActive(next);
      setRecord({ actor, data: result.snapshot });
      setStatus("connected");
      joinAttempt.current = null;
      void rooms.refetch();
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.status >= 400 && e.status < 500)
        joinAttempt.current = null;
      if (e instanceof ApiError && (e.status === 401 || e.status === 403))
        void refreshRef.current();
      if (!activeRef.current) setStatus("unavailable");
      throw e;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const leave = async () => {
    if (lock.current) return;
    lock.current = true;
    try {
      if (activeRef.current) await command({ action: "leave" });
      setActive(null);
      activeRef.current = null;
      setRecord(null);
      setStatus("choosing");
      void rooms.refetch();
    } finally {
      lock.current = false;
    }
  };
  useEffect(() => {
    generation.current++;
    setRecord(null);
    setActive(null);
    activeRef.current = null;
    setStatus("choosing");
    joinAttempt.current = null;
    bubbleAttempt.current = null;
  }, [actor]);
  useEffect(() => {
    if (!active) return;
    let source: EventSource | null = null,
      disposed = false;
    const start = () => {
      if (disposed || document.hidden || !navigator.onLine) return;
      source?.close();
      source = new EventSource(`/api/v1/plaza/rooms/${active.slug}/stream`, {
        withCredentials: true,
      });
      source.addEventListener("plaza.changed", () => void reload());
      source.addEventListener("plaza.expired", () => void reload());
      source.onerror = () => {
        if (!disposed) setStatus("reconnecting");
      };
      void reload();
    };
    const pause = () => {
      source?.close();
      source = null;
      void command({ action: "stop", sequence: ++sequence.current }).catch(
        () => {},
      );
      setStatus("reconnecting");
    };
    const resume = async () => {
      if (document.hidden || !navigator.onLine) return;
      await refreshRef.current();
      if (!disposed && identity.current === active.actor) start();
    };
    const visibility = () => (document.hidden ? pause() : void resume());
    start();
    const poll = window.setInterval(() => void reload(), 5000);
    const heartbeat = window.setInterval(() => {
      if (!document.hidden && navigator.onLine)
        void command({ action: "heartbeat" }).catch(() => {});
    }, 15000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("offline", pause);
    window.addEventListener("online", resume);
    return () => {
      disposed = true;
      source?.close();
      clearInterval(poll);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("offline", pause);
      window.removeEventListener("online", resume);
    };
  }, [active?.lease, command, reload]);
  useEffect(
    () => () => {
      generation.current++;
      const old = activeRef.current;
      if (old)
        void sendCommand(old.slug, {
          action: "leave",
          instance_id: instance.current,
          lease: old.lease,
        }).catch(() => {});
    },
    [],
  );
  const move = (target: Point) => {
    void command({
      action: "move",
      sequence: ++sequence.current,
      target,
    }).catch(() => {});
  };
  const stop = () => {
    if (activeRef.current)
      void command({ action: "stop", sequence: ++sequence.current }).catch(
        () => {},
      );
  };
  const publishBubble = async (body: string, offer_id: string | null) => {
    const key = JSON.stringify([
      activeRef.current?.slug,
      identity.current,
      body,
      offer_id,
    ]);
    if (bubbleAttempt.current?.key !== key)
      bubbleAttempt.current = { key, operation_id: crypto.randomUUID() };
    await command({
      action: "bubble",
      body,
      offer_id,
      operation_id: bubbleAttempt.current.operation_id,
    });
    bubbleAttempt.current = null;
    await reload();
  };
  return {
    rooms,
    snapshot:
      record && record.actor === actor && !document.hidden && navigator.onLine
        ? record.data
        : null,
    status,
    error,
    busy,
    join,
    leave,
    move,
    stop,
    publishBubble,
    clearBubble: async () => {
      await command({ action: "clear_bubble" });
      await reload();
    },
    reportBubble,
    retry: reload,
  };
}
