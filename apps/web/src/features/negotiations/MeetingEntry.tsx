import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  ArrowUpRight,
  HandCoins,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  Input,
  Label,
  Textarea,
} from "@pixelvault/ui";
import type { Offer } from "@pixelvault/contracts";
import { apiRequest, operationId } from "../../app/api";
import { useSession } from "../../app/session";
import { ErrorNotice } from "../../components";
import { money } from "../../lib/format";

export function MeetingEntry({
  offerId,
  applicationId,
  meetingId,
}: {
  offerId: string;
  applicationId?: string;
  meetingId?: string | null;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <div className="my-4 space-y-3">
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          if (meetingId) {
            navigate(`/meetings/${meetingId}`);
            return;
          }
          setBusy(true);
          setError(null);
          try {
            const result = await apiRequest<{ id: string }>("/meetings", {
              method: "POST",
              body: JSON.stringify({
                kind: "borrowing",
                offer_id: offerId,
                application_id: applicationId,
                operation_id: operationId(),
              }),
            });
            navigate(`/meetings/${result.id}`);
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        <CalendarClock size={17} />
        {busy ? "Opening room…" : "Open agreement room"}
        <ArrowUpRight size={15} />
      </Button>
      <p className="text-xs text-muted-foreground">
        Meet, review the proposal and confirm the same version together.
      </p>
      {error && <ErrorNotice error={error} />}
    </div>
  );
}

export function InvestmentPitch({ offer }: { offer: Offer }) {
  const { session } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10000"),
    [share, setShare] = useState("20"),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  if (session?.member?.id === offer.lender.id) return null;
  return (
    <section className="my-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-border bg-card p-5 text-foreground">
      <div className="flex min-w-0 items-start gap-3">
        <HandCoins className="mt-1 size-6 shrink-0 text-primary" />
        <div>
          <h2 className="text-lg! font-extrabold!">
            Pitch in with this lender
          </h2>
          <p className="mt-1! max-w-[65ch] text-sm text-muted-foreground">
            Discuss a contribution and a share of the interest it earns. Start
            with a private meeting.
          </p>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <CalendarClock size={17} />
            Send an investor pitch
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-w-lg!"
          aria-describedby="pitch-description"
        >
          <DialogTitle>Build a proposal together</DialogTitle>
          <DialogDescription id="pitch-description">
            Your request starts a private test-mode room with{" "}
            {offer.lender.display_name}. It transfers no money.
          </DialogDescription>
          <form
            noValidate
            className="mt-4 grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              const cents = Math.round(Number(amount) * 100),
                bps = Math.round(Number(share) * 100);
              if (
                !Number.isSafeInteger(cents) ||
                cents < 10000 ||
                !Number.isSafeInteger(bps) ||
                bps < 0 ||
                bps > 10000
              ) {
                setError(
                  new Error(
                    "Enter at least ₱100 and a share between 0% and 100%.",
                  ),
                );
                return;
              }
              setBusy(true);
              try {
                const result = await apiRequest<{ id: string }>("/meetings", {
                  method: "POST",
                  body: JSON.stringify({
                    kind: "investment",
                    offer_id: offer.id,
                    amount: cents,
                    share_bps: bps,
                    message,
                    operation_id: operationId(),
                  }),
                });
                setOpen(false);
                navigate(`/meetings/${result.id}`);
              } catch (problem) {
                setError(problem);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="pitch-amount">Proposed contribution (₱)</Label>
              <Input
                id="pitch-amount"
                type="number"
                min="100"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pitch-share">
                Your share of attributable collected interest (%)
              </Label>
              <Input
                id="pitch-share"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={share}
                onChange={(e) => setShare(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Example only: if your capital earns ₱1,000 collected interest,
                this proposal gives you{" "}
                {Number.isFinite(Number(share))
                  ? money(Math.round((100000 * Number(share)) / 100))
                  : "—"}
                . Not a promised return.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pitch-message">Introduce your proposal</Label>
              <Textarea
                id="pitch-message"
                className="min-h-24 resize-none"
                maxLength={4000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What would you like to discuss?"
              />
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              Capital is at risk. No guaranteed repayment. Funding remains
              unavailable until pricing, agreement and settlement requirements
              are configured.
            </p>
            {error && <ErrorNotice error={error} />}
            <Button type="submit" disabled={busy}>
              {busy ? "Sending pitch…" : "Send private pitch"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
