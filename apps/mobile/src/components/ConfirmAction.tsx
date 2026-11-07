import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Label,
} from "@pixelvault/ui";
import { ApiError } from "../app/api";
import { ErrorState, Note } from "./ui";
export function ConfirmAction({
  label,
  title,
  description,
  children,
  fingerprint = "",
  disabled = false,
  onConfirm,
  reconcile,
}: {
  label: string;
  title: string;
  description: string;
  children?: ReactNode;
  fingerprint?: string;
  disabled?: boolean;
  onConfirm: () => Promise<unknown>;
  reconcile?: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState<unknown>(null);
  const lock = useRef(false),
    consentId = useId();
  useEffect(() => {
    setOpen(false);
    setConsent(false);
    setError(null);
    setUncertain(false);
  }, [fingerprint]);
  return (
    <>
      <Button
        disabled={disabled}
        className="min-h-12 w-full"
        onClick={() => {
          setConsent(false);
          setError(null);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {children}
          {error !== null && <ErrorState error={error} />}
          {uncertain ? (
            <Note>
              The result is unconfirmed. Refresh the current record before
              another attempt; an exact retry keeps the same operation ID.
            </Note>
          ) : null}
          {uncertain && reconcile ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await reconcile();
                  setUncertain(false);
                  setConsent(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Refresh the current record
            </Button>
          ) : null}
          <div className="flex items-start gap-3">
            <Checkbox
              id={consentId}
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              className="mt-1 size-5"
            />
            <Label
              htmlFor={consentId}
              className="min-h-11 text-sm leading-relaxed"
            >
              I have reviewed the current details and want to continue.
            </Label>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={busy}
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Go back
            </Button>
            <Button
              className="flex-1"
              disabled={busy || !consent || uncertain || !navigator.onLine}
              onClick={async () => {
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError(null);
                try {
                  await onConfirm();
                  setOpen(false);
                } catch (e) {
                  setError(e);
                  if (
                    e instanceof ApiError &&
                    (e.status === 0 || e.status >= 500)
                  )
                    setUncertain(true);
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              {busy ? "Confirming…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
