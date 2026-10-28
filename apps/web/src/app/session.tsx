import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@pixelvault/contracts";
import { apiRequest, setCsrfToken, post } from "./api";
const SessionContext = createContext<{
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
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const session = await apiRequest<Session>("/auth/session");
      setCsrfToken(session.csrf_token);
      return session;
    },
    retry: false,
  });
  useEffect(() => {
    if (!query.data?.member?.id) return;
    const record = () => {
      if (!document.hidden) void post("/auth/presence", {}).catch(() => {});
    };
    record();
    const timer = window.setInterval(record, 45_000);
    document.addEventListener("visibilitychange", record);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", record);
    };
  }, [query.data?.member?.id]);
  return (
    <SessionContext
      value={{
        session: query.data,
        loading: query.isPending,
        error: query.error,
        refresh: () => query.refetch(),
        signOut: async () => {
          await post("/auth/sign-out", {});
          client.clear();
          await query.refetch();
        },
      }}
    >
      {children}
    </SessionContext>
  );
}
export const useSession = () => useContext(SessionContext);
