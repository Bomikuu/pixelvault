import { useId, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pixelvault/ui";
import { MessageCircle, Send, X, Loader2, Link2, Clock3 } from "lucide-react";
import { ErrorNotice } from "../../components";
import type { OfferEntry } from "./types";

export function BubbleComposer({
  open,
  onOpenChange,
  enabled,
  offers,
  onPost,
  onClear,
  hasBubble,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    lock = useRef(false),
    id = useId();
  const normalized = body.replace(/[\r\n]+/g, " ").trim(),
    length = Array.from(normalized).length;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)]! max-w-lg! grid-cols-[minmax(0,1fr)]! overflow-y-auto! p-5! sm:p-6! [&>*]:min-w-0">
        <div className="flex items-center gap-3 pr-7">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <DialogTitle className="text-lg!">Post a bubble</DialogTitle>
            <DialogDescription className="mt-1 text-xs!">
              Say hello or share your current offer.
            </DialogDescription>
          </div>
        </div>
        <form
          aria-label="Post a public speech bubble"
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (lock.current || !enabled || !length || length > 120) return;
            lock.current = true;
            setBusy(true);
            setError(null);
            try {
              await onPost(normalized, offer === "none" ? null : offer);
              setBody("");
              setOffer("none");
              onOpenChange(false);
            } catch (e) {
              setError(e);
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          <div>
            <label htmlFor={id} className="mb-2 block text-xs font-bold">
              Your public bubble
            </label>
            <Textarea
              id={id}
              aria-label="Your public bubble"
              placeholder={
                enabled
                  ? "Say something in this city room…"
                  : "Join a room to share a bubble"
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={240}
              rows={4}
              disabled={!enabled || busy}
              className="min-h-28! resize-none bg-card! text-base! text-foreground! placeholder:text-muted-foreground!"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" />
                Visible for 60 seconds
              </span>
              <span
                className={`tabular-nums ${length > 120 ? "text-destructive" : ""}`}
              >
                {length}/120
              </span>
            </div>
          </div>
          {offers.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold">
                <Link2 className="size-3.5 text-primary" />
                Attach your available offer
              </p>
              <Select
                value={offer}
                onValueChange={setOffer}
                disabled={!enabled || busy}
              >
                <SelectTrigger
                  aria-label="Attach your available offer"
                  className="min-h-11! w-full! min-w-0! bg-card! text-foreground! [&>span]:truncate"
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
          <p className="rounded-xl bg-secondary px-3 py-2.5 text-xs leading-relaxed text-secondary-foreground">
            Visible to everyone in this room, above your character and in Room
            chat. A new bubble replaces your previous one.
          </p>
          {!!error && <ErrorNotice error={error} />}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {hasBubble && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto min-h-11! text-xs!"
                disabled={!enabled || busy}
                onClick={async () => {
                  if (lock.current) return;
                  lock.current = true;
                  setBusy(true);
                  setError(null);
                  try {
                    await onClear();
                  } catch (e) {
                    setError(e);
                  } finally {
                    lock.current = false;
                    setBusy(false);
                  }
                }}
              >
                <X className="size-4" />
                Clear current bubble
              </Button>
            )}
            <Button
              type="submit"
              className="min-h-11!"
              disabled={!enabled || busy || !length || length > 120}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Post bubble
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
