import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@pixelvault/ui";
import { ErrorNotice } from "../components";
import { useSession } from "./session";

export function SignOutButton({ inMeeting = false }: { inMeeting?: boolean }) {
  const { signOut } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const cancel = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting.current) return;
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={17} />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-md!"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancel.current?.focus();
        }}
      >
        <LogOut className="size-7 text-primary" aria-hidden="true" />
        <DialogTitle>Sign out of PixelVault?</DialogTitle>
        <DialogDescription className="leading-relaxed!">
          You’ll need to sign in again to access your private workspace.
          {inMeeting && " Any unsent message in this room will be lost."}
        </DialogDescription>
        {error && <ErrorNotice error={error} />}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancel}
            variant="outline"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Stay signed in
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              if (submitting.current) return;
              submitting.current = true;
              setBusy(true);
              setError(null);
              try {
                await signOut();
                setOpen(false);
                navigate("/explore", { replace: true });
              } catch (problem) {
                setError(problem);
              } finally {
                submitting.current = false;
                setBusy(false);
              }
            }}
          >
            <LogOut size={16} />
            {busy ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
