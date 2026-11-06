import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Textarea, Label } from "@pixelvault/ui";
import { apiRequest, post } from "../../app/api";
import { ErrorNotice, Loading, PageHeading, Empty } from "../../components";
type Row = {
  id: string;
  body: string;
  room_slug: string;
  author_handle: string;
  version: number;
  status: string;
  reports: { id: string; reason: string }[];
};
export function ModerationQueue() {
  const query = useQuery({
    queryKey: ["plaza-moderation"],
    queryFn: () => apiRequest<{ bubbles: Row[] }>("/admin/plaza/bubbles"),
    retry: false,
  });
  const [reason, setReason] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState<unknown>(null);
  return (
    <div className="space-y-5">
      <PageHeading
        title="Marketplace moderation"
        description="Reported speech bubbles, retained for an accountable review."
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} />
      ) : (
        <>
          {!!error && <ErrorNotice error={error} />}{" "}
          {!query.data?.bubbles.length && (
            <Empty title="No open bubble reports.">
              New reports will appear here for review.
            </Empty>
          )}
          {query.data?.bubbles.map((b) => (
            <section
              key={b.id}
              className="space-y-3 rounded-xl border border-border bg-card p-5"
            >
              <h2 className="text-base! font-bold!">
                @{b.author_handle} · {b.room_slug}
              </h2>
              <p className="rounded-lg bg-muted p-3 text-sm">{b.body}</p>
              {b.reports.map((r) => (
                <p key={r.id} className="text-sm text-muted-foreground">
                  Report: {r.reason}
                </p>
              ))}
              <Label htmlFor={`reason-${b.id}`}>Reason for your decision</Label>
              <Textarea
                id={`reason-${b.id}`}
                value={reason[b.id] || ""}
                maxLength={2000}
                onChange={(e) =>
                  setReason((old) => ({ ...old, [b.id]: e.target.value }))
                }
              />
              <div className="flex gap-2">
                {(["keep", "remove"] as const).map((decision) => (
                  <Button
                    key={decision}
                    variant={decision === "remove" ? "destructive" : "outline"}
                    disabled={!!busy || !reason[b.id]?.trim()}
                    onClick={async () => {
                      if (busy) return;
                      setBusy(b.id);
                      setError(null);
                      try {
                        await post(`/admin/plaza/bubbles/${b.id}/decision`, {
                          decision,
                          reason: reason[b.id],
                          expected_version: b.version,
                        });
                        await query.refetch();
                      } catch (e) {
                        setError(e);
                        await query.refetch();
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    {decision === "remove"
                      ? "Remove bubble"
                      : "Keep · resolve report"}
                  </Button>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
