import { useInfiniteQuery } from "@tanstack/react-query";
import type { ApiSchemas } from "@pixelvault/contracts";
import type { CoarseArea } from "@pixelvault/ui";
import { useSession } from "../../app/session";
import { api } from "../../app/api";
export type DiscoveryOffer = ApiSchemas["schemas"]["DiscoveryOffer"];
export type Discovery = ApiSchemas["schemas"]["Discovery"];
export const mapToken = () => {
  const token = String(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "");
  return token.startsWith("pk.") ? token : "";
};
export function useDiscovery() {
  const { session, loading } = useSession();
  return useInfiniteQuery({
    queryKey: ["mobile-discovery", session?.member?.id || "guest"],
    enabled: !loading,
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api<Discovery>(
        `/community/discovery${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        { signal },
      ),
    getNextPageParam: (page) => page.next_cursor || undefined,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
