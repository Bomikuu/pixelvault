import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@pixelvault/ui";
import { MapPin, Users, ArrowRight, Loader2 } from "lucide-react";
import { ActionLink, ErrorNotice } from "../../components";
import type { Room } from "./types";
import { ThemeToggle } from "../../app/ThemeToggle";
import { SignOutButton } from "../../app/SignOutButton";
export function RoomChooser({
  open,
  onOpenChange,
  rooms,
  busy,
  signedIn,
  current,
  onJoin,
  onLeave,
  error,
  retry,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rooms: Room[];
  busy: boolean;
  signedIn: boolean;
  current?: string;
  onJoin: (slug: string) => Promise<void>;
  onLeave: () => Promise<void>;
  error: unknown;
  retry: () => void;
}) {
  const [selected, setSelected] = useState("manila-01"),
    [localError, setLocalError] = useState<unknown>(null);
  const room = rooms.find((r) => r.slug === selected),
    full =
      (room?.online || 0) >= (room?.capacity || 40) && current !== selected;
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
    >
      <DialogContent className="grid-cols-[minmax(0,1fr)]! [&>*]:min-w-0 max-w-xl! max-h-[calc(100dvh-2rem)]! overflow-y-auto!">
        <DialogTitle className="text-xl!">
          Find your corner of the community.
        </DialogTitle>
        <DialogDescription>
          Choose a city room. Your name, character and speech bubbles will be
          visible to people who join it. Positions are virtual; your location is
          never tracked.
        </DialogDescription>
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          role="group"
          aria-label="City servers"
        >
          {rooms.map((r) => (
            <Button
              key={r.slug}
              variant="outline"
              className={`h-auto! min-h-24! justify-start! gap-3! rounded-xl! p-4! text-left! ${selected === r.slug ? "border-primary! bg-accent!" : "hover:border-primary!"}`}
              aria-pressed={selected === r.slug}
              onClick={() => setSelected(r.slug)}
            >
              <MapPin className="size-5 shrink-0 text-primary" />
              <span className="min-w-0">
                <strong className="block text-sm">{r.area.name}</strong>
                <span className="mt-2 flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <Users className="size-3" />
                  {r.online || 0}/{r.capacity} joined · Room 01
                </span>
              </span>
            </Button>
          ))}
        </div>
        {!!(localError || error) && <ErrorNotice error={localError || error} />}
        {!rooms.length && (
          <Button variant="outline" onClick={retry}>
            Reload rooms
          </Button>
        )}
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            One character per account. You choose when to join.
          </p>
          {signedIn ? (
            <Button
              disabled={!room || busy || full}
              className="min-h-11 shrink-0"
              onClick={async () => {
                setLocalError(null);
                try {
                  await onJoin(selected);
                  onOpenChange(false);
                } catch (e) {
                  setLocalError(e);
                }
              }}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {busy ? "Joining…" : full ? "Room full" : "Join this room"}
            </Button>
          ) : (
            <Button asChild>
              <Link to="/sign-in" state={{ from: "/marketplace" }}>
                Sign in to join
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <div>
            {current && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  try {
                    await onLeave();
                    onOpenChange(false);
                  } catch (e) {
                    setLocalError(e);
                  }
                }}
              >
                Leave room
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {signedIn && <SignOutButton />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
