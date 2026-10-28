import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest, operationId } from "../../app/api";
import { useSession } from "../../app/session";
import type { Meeting } from "./types";

export function useMeeting(id: string | undefined) {
  const client = useQueryClient();
  const { session } = useSession();
  const [connection, setConnection] = useState<
    "connecting" | "live" | "reconnecting"
  >("connecting");
  const key = ["meeting", id, session?.member?.id];
  const pending = useRef<{ identity: string; body: string } | null>(null);
  const query = useQuery({
    queryKey: key,
    queryFn: () => apiRequest<Meeting>(`/meetings/${id}`),
    enabled: !!id,
    refetchInterval: connection === "live" ? 10_000 : 3000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (!id) return;
    const source = new EventSource(`/api/v1/meetings/${id}/stream`, {
      withCredentials: true,
    });
    const refresh = () => {
      setConnection("live");
      void client.invalidateQueries({ queryKey: ["meeting", id] });
    };
    source.addEventListener("room.changed", refresh);
    source.addEventListener("room.expired", () => {
      setConnection("reconnecting");
      source.close();
      void client.invalidateQueries({ queryKey: ["session"] });
    });
    source.onerror = () => setConnection("reconnecting");
    source.onopen = () => setConnection("live");
    return () => source.close();
  }, [id, client]);
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const identity = JSON.stringify([id, session?.member?.id, data]);
      if (pending.current?.identity !== identity) {
        pending.current = {
          identity,
          body: JSON.stringify({
            expected_revision: query.data?.revision,
            operation_id: operationId(),
            ...data,
          }),
        };
      }
      return apiRequest<Meeting>(`/meetings/${id}`, {
        method: "POST",
        body: pending.current.body,
      });
    },
    onSuccess: (data) => {
      pending.current = null;
      client.setQueryData(key, data);
      void client.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (error) => {
      // An uncertain outcome reuses the exact operation on a manual retry.
      // A definite rejection needs a new revision/key after refreshing.
      if (error instanceof ApiError && error.status > 0 && error.status < 500)
        pending.current = null;
      void client.invalidateQueries({ queryKey: ["meeting", id] });
    },
  });
  const self = query.data?.participants.find(
    (p) => p.id === session?.member?.id,
  );
  useEffect(() => {
    if (!self?.checked_in || !id) return;
    const interval = window.setInterval(() => {
      if (!document.hidden)
        void apiRequest(`/meetings/${id}`, {
          method: "POST",
          body: JSON.stringify({
            action: "heartbeat",
            operation_id: operationId(),
          }),
        }).catch(() => setConnection("reconnecting"));
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [id, self?.checked_in]);
  const act = useCallback(
    (data: Record<string, unknown>) => mutation.mutateAsync(data),
    [mutation.mutateAsync],
  );
  return {
    ...query,
    act,
    busy: mutation.isPending,
    actionError: mutation.error,
    resetError: mutation.reset,
    connection,
    self,
  };
}
