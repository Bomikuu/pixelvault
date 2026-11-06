import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Textarea,
  Label,
} from "@pixelvault/ui";
import { ArrowUpRight, Flag, EyeOff } from "lucide-react";
import { ActionLink, MemberAvatar, ErrorNotice } from "../../components";
import type { Participant, OfferEntry } from "./types";
export function MemberPopover({
  person,
  offers,
  onClose,
  onOffer,
  onReport,
  onHide,
}: {
  person: Participant | null;
  offers: OfferEntry[];
  onClose: () => void;
  onOffer: (id: string) => void;
  onReport: (id: string, reason: string) => Promise<unknown>;
  onHide: (id: string) => void;
}) {
  const [reporting, setReporting] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [reported, setReported] = useState(false);
  const mine = offers.filter((o) => o.lender.handle === person?.person.handle);
  return (
    <Dialog
      open={!!person}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setReporting(false);
          setError(null);
          setReported(false);
          setReason("");
        }
      }}
    >
      <DialogContent className="grid-cols-[minmax(0,1fr)]! [&>*]:min-w-0 max-h-[calc(100dvh-2rem)]! max-w-md! overflow-y-auto!">
        <DialogTitle>
          {person?.person.display_name || "Community member"}
        </DialogTitle>
        <DialogDescription>
          Public profile and available offers. Being in a room does not verify
          lending eligibility or guarantee repayment.
        </DialogDescription>
        {person && (
          <>
            <div className="flex items-center gap-3">
              <MemberAvatar
                name={person.person.display_name}
                avatarKey={person.person.avatar_key}
                photoUrl={person.person.photo_url}
                reputation={person.person.reputation}
                size={56}
              />
              <div>
                <strong className="text-sm">@{person.person.handle}</strong>
                <p className="mt-1 text-xs text-muted-foreground">
                  Joined this room
                </p>
              </div>
            </div>
            {person.bubble && (
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
                {person.bubble.text}
              </div>
            )}
            {mine.map((o) => (
              <Button
                key={o.id}
                variant="outline"
                className="h-auto! min-h-11! justify-between! text-left! whitespace-normal!"
                onClick={() => onOffer(o.id)}
              >
                {o.title}
                <ArrowUpRight className="size-4 shrink-0" />
              </Button>
            ))}
            {!mine.length && (
              <p className="text-sm text-muted-foreground">
                No published offer attached to this member in the current room.
              </p>
            )}
            <ActionLink
              to={`/members/${person.person.handle}`}
              variant="outline"
            >
              View public profile
              <ArrowUpRight className="size-4" />
            </ActionLink>
            {person.bubble && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onHide(person.bubble!.id);
                    onClose();
                  }}
                >
                  <EyeOff className="size-4" />
                  Hide bubble
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setReporting(!reporting)}
                >
                  <Flag className="size-4" />
                  Report bubble
                </Button>
              </div>
            )}
            {reporting && person.bubble && (
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  setError(null);
                  try {
                    await onReport(person.bubble!.id, reason);
                    setReported(true);
                    setReporting(false);
                    onHide(person.bubble!.id);
                  } catch (e) {
                    setError(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Label htmlFor="plaza-report-reason">
                  What should a moderator review?
                </Label>
                <Textarea
                  id="plaza-report-reason"
                  value={reason}
                  maxLength={2000}
                  required
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button disabled={busy || !reason.trim()} type="submit">
                  {busy ? "Recording…" : "Send report"}
                </Button>
              </form>
            )}
            {reported && (
              <p role="status" className="text-sm text-muted-foreground">
                Your report was recorded for moderation.
              </p>
            )}
            {!!error && <ErrorNotice error={error} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
