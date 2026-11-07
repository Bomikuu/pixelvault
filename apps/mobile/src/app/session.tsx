import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@pixelvault/contracts";
import { api, client, post } from "./api";
const Context = createContext<{
  session: Session | undefined;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<unknown>;
  signOut: () => Promise<void>;
}>({
  session: undefined,
  loading: true,
  error: null,
  refresh: async () => {},
  signOut: async () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const identity = useRef<string | null | undefined>(undefined);
  const [changing, setChanging] = useState(false);
  const query = useQuery({
    queryKey: ["mobile-session"],
    queryFn: async () => {
      const session = await api<Session>("/auth/session");
      const next = session.member?.id || null;
      if (identity.current !== undefined && identity.current !== next) {
        client.clearSession();
        await cache.cancelQueries({
          predicate: (q) => q.queryKey[0] !== "mobile-session",
        });
        cache.removeQueries({
          predicate: (q) => q.queryKey[0] !== "mobile-session",
        });
      }
      identity.current = next;
      client.setCsrfToken(session.csrf_token);
      return session;
    },
  });
  useEffect(() => {
    let active = true,
      refreshing = false;
    const pause = () => setChanging(true);
    const resume = async () => {
      if (document.hidden || refreshing) return;
      refreshing = true;
      setChanging(true);
      client.clearSession();
      try {
        await cache.cancelQueries({
          predicate: (q) => q.queryKey[0] !== "mobile-session",
        });
        cache.removeQueries({
          predicate: (q) => q.queryKey[0] !== "mobile-session",
        });
        await query.refetch();
      } finally {
        refreshing = false;
        if (active) setChanging(false);
      }
    };
    const visibility = () => (document.hidden ? pause() : void resume());
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("offline", pause);
    window.addEventListener("online", resume);
    window.addEventListener("pixelvault:pause", pause);
    window.addEventListener("pixelvault:resume", resume);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("offline", pause);
      window.removeEventListener("online", resume);
      window.removeEventListener("pixelvault:pause", pause);
      window.removeEventListener("pixelvault:resume", resume);
    };
  }, [cache]);
  useEffect(() => {
    if (!query.data?.member) return;
    const presence = () => {
      if (!document.hidden && navigator.onLine)
        void post("/auth/presence", {}).catch(() => {});
    };
    const timer = window.setInterval(presence, 45_000);
    presence();
    document.addEventListener("visibilitychange", presence);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", presence);
    };
  }, [query.data?.member?.id]);
  return (
    <Context
      value={{
        session: changing || query.isError ? undefined : query.data,
        loading: changing || query.isPending,
        error: query.error,
        refresh: () => query.refetch(),
        signOut: async () => {
          await post("/auth/sign-out", {});
          setChanging(true);
          client.clearSession();
          await cache.cancelQueries();
          cache.clear();
          identity.current = null;
          try {
            await query.refetch();
          } finally {
            setChanging(false);
          }
        },
      }}
    >
      {children}
    </Context>
  );
}
export const useSession = () => useContext(Context);
export function useMemberQuery<T>(
  key: unknown[],
  path: string,
  options: { enabled?: boolean; interval?: number } = {},
) {
  const { session } = useSession();
  return useQuery({
    queryKey: ["member", session?.member?.id, ...key],
    queryFn: ({ signal }) => api<T>(path, { signal }),
    enabled: !!session?.member && options.enabled !== false,
    refetchInterval: options.interval || false,
    refetchIntervalInBackground: false,
  });
}
