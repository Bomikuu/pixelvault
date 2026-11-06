import { useRef, useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pixelvault/ui";
import { MessageCircle, Send, X, Loader2, Link2 } from "lucide-react";
import { ErrorNotice } from "../../components";
import type { OfferEntry } from "./types";
export function BubbleComposer({
  enabled,
  offers,
  onPost,
  onClear,
  hasBubble,
}: {
  enabled: boolean;
  offers: OfferEntry[];
  onPost: (body: string, offer: string | null) => Promise<void>;
  onClear: () => Promise<void>;
  hasBubble: boolean;
}) {
  const [body, setBody] = useState(""),
    [offer, setOffer] = useState("none"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    lock = useRef(false);
  const normalized = body.replace(/[\r\n]+/g, " ").trim(),
    length = Array.from(normalized).length;
  return (
    <div className="shrink-0 border-t border-border bg-card px-3 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-5">
      <form
        aria-label="Post a public speech bubble"
        onSubmit={async (e) => {
          e.preventDefault();
          if (lock.current || !enabled || !length || length > 120) return;
          lock.current = true;
          setBusy(true);
          setError(null);
          try {
            await onPost(normalized, offer === "none" ? null : offer);
            setBody("");
          } catch (e) {
            setError(e);
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
        className="mx-auto max-w-5xl"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="hidden size-5 shrink-0 text-primary sm:block" />
          <Input
            aria-label="Your public bubble"
            placeholder={
              enabled
                ? "Say something in this city room…"
                : "Join a room to share a bubble"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={240}
            disabled={!enabled || busy}
            className="min-h-11! min-w-0 flex-1 text-base!"
          />
          {offers.length > 0 && (
            <Select
              value={offer}
              onValueChange={setOffer}
              disabled={!enabled || busy}
            >
              <SelectTrigger
                aria-label="Attach your available offer"
                className="hidden min-h-11! w-44! sm:inline-flex"
              >
                <Link2 className="size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No offer attached</SelectItem>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasBubble && (
            <Button
              type="button"
              variant="ghost"
              className="size-11! shrink-0 p-0!"
              disabled={!enabled || busy}
              aria-label="Clear your bubble"
              onClick={() => {
                void onClear().catch(setError);
              }}
            >
              <X className="size-4" />
            </Button>
          )}
          <Button
            type="submit"
            className="min-h-11 shrink-0 px-3! sm:px-5!"
            disabled={!enabled || busy || !length || length > 120}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="hidden sm:inline">Post bubble</span>
            <span className="sr-only sm:hidden">Post bubble</span>
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span>
            Visible to everyone in this room · Disappears after 60 seconds
          </span>
          <span className={length > 120 ? "text-destructive" : ""}>
            {length}/120
          </span>
        </div>
        {offers.length > 0 && (
          <div className="mt-2 sm:hidden">
            <Select
              value={offer}
              onValueChange={setOffer}
              disabled={!enabled || busy}
            >
              <SelectTrigger
                aria-label="Attach your available offer"
                className="min-h-11! w-full!"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No offer attached</SelectItem>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {!!error && (
          <div className="mt-2">
            <ErrorNotice error={error} />
          </div>
        )}
      </form>
    </div>
  );
}
