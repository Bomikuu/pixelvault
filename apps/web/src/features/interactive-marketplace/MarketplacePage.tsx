import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandMark, Button } from "@pixelvault/ui";
import {
  ArrowLeft,
  ChevronDown,
  Users,
  Wifi,
  WifiOff,
  LogOut,
  Loader2,
} from "lucide-react";
import { ThemeToggle, legacyThemeClasses } from "../../app/ThemeToggle";
import { useSession } from "../../app/session";
import { ErrorNotice } from "../../components";
import { usePlaza } from "./usePlaza";
import { World } from "./World";
import { RoomChooser } from "./RoomChooser";
import { BubbleComposer } from "./BubbleComposer";
import { PeopleDrawer } from "./PeopleDrawer";
import { MemberPopover } from "./MemberPopover";
import { OfferDialog } from "./OfferDialog";
import type { Room } from "./types";
const INITIAL_ROOM: Room = {
  slug: "manila-01",
  name: "Manila · Room 01",
  area: {
    code: "manila",
    name: "Manila",
    latitude: 14.5995,
    longitude: 120.9842,
    approximate: true,
    source: "synthetic-area-centroid",
  },
  capacity: 40,
  width: 1000,
  height: 700,
};

export function MarketplacePage() {
  const plaza = usePlaza(),
    { session, loading } = useSession(),
    navigate = useNavigate();
  const [chooser, setChooser] = useState(true),
    [drawer, setDrawer] = useState(false),
    [memberId, setMemberId] = useState<string | null>(null),
    [offerId, setOfferId] = useState<string | null>(null),
    [hidden, setHidden] = useState<Set<string>>(() => new Set()),
    [lastRoom, setLastRoom] = useState(INITIAL_ROOM);
  const stopRef = useRef(plaza.stop);
  stopRef.current = plaza.stop;
  useEffect(() => {
    if (chooser || drawer || memberId || offerId) stopRef.current();
  }, [chooser, drawer, memberId, offerId]);
  useEffect(() => {
    if (plaza.snapshot?.room) setLastRoom(plaza.snapshot.room);
  }, [plaza.snapshot?.room.slug]);
  const snapshot = plaza.snapshot,
    room = snapshot?.room || lastRoom,
    own = snapshot?.participants.find(
      (p) => p.participant_id === snapshot.self?.participant_id,
    );
  const member =
    snapshot?.participants.find((p) => p.participant_id === memberId) || null;
  const world = useMemo(
    () =>
      snapshot
        ? {
            ...snapshot,
            participants: snapshot.participants.map((p) =>
              p.bubble && hidden.has(p.bubble.id) ? { ...p, bubble: null } : p,
            ),
          }
        : null,
    [snapshot, hidden],
  );
  const connected = plaza.status === "connected" && !!snapshot?.self?.owned;
  const label =
    plaza.status === "connected"
      ? "Connected"
      : plaza.status === "reconnecting"
        ? "Reconnecting…"
        : plaza.status === "controlled_elsewhere"
          ? "Character controlled elsewhere"
          : plaza.status === "expired"
            ? "Sign in again"
            : plaza.busy
              ? "Joining…"
              : "Choose a room";
  const openOffer = (id: string) => {
    setDrawer(false);
    setMemberId(null);
    setOfferId(id);
  };
  return (
    <div
      className={`flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-background text-foreground ${legacyThemeClasses}`}
    >
      <a
        href="#plaza-world"
        className="sr-only z-[100] bg-card p-3 text-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to marketplace
      </a>
      <header className="z-30 flex min-h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-4 sm:px-5">
        <Link
          to="/explore"
          aria-label="PixelVault community"
          className="flex shrink-0 items-center gap-2"
        >
          <span className="[&_svg]:h-8 [&_svg]:w-7">
            <BrandMark compact />
          </span>
          <span className="hidden text-lg font-extrabold md:block">
            Pixel<span className="text-primary">Vault</span>
          </span>
        </Link>
        <h1 className="hidden border-l border-border pl-4 text-base! font-bold! xl:block">
          Community marketplace
        </h1>
        <Button
          variant="outline"
          className="min-h-11! min-w-0 flex-1 justify-between! gap-2! px-3! text-xs! sm:max-w-64 sm:text-sm!"
          onClick={() => setChooser(true)}
        >
          <span className="truncate">
            {snapshot ? room.name : "Choose a city room"}
          </span>
          <ChevronDown className="size-4 shrink-0" />
        </Button>
        <span className="ml-auto hidden items-center gap-1.5 text-xs font-semibold sm:flex">
          <span
            className={`size-2 rounded-full ${connected ? "bg-emerald-600" : "bg-muted-foreground"}`}
          />
          {snapshot ? `${snapshot.participants.length} joined` : "Not joined"}
        </span>
        <Button
          variant="outline"
          className="size-11! shrink-0 p-0! sm:h-11! sm:w-auto! sm:px-3!"
          aria-label="Open people and offers"
          onClick={() => setDrawer(true)}
          disabled={!snapshot}
        >
          <Users className="size-4" />
          <span className="hidden sm:inline">People & offers</span>
        </Button>
        <span className="hidden sm:block">
          <ThemeToggle />
        </span>
        <Button
          asChild
          variant="ghost"
          className="size-11! shrink-0 p-0!"
          aria-label="Return to Explore"
        >
          <Link to="/explore">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
      </header>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border bg-secondary px-3 py-2 text-[10px] text-secondary-foreground sm:px-5 sm:text-xs">
        <span>
          {session?.environment === "live"
            ? "Community marketplace · Live origination disabled"
            : "Test community · No real funds move"}
        </span>
        <span role="status" className="flex items-center gap-1.5">
          {plaza.busy ? (
            <Loader2 className="size-3 animate-spin" />
          ) : connected ? (
            <Wifi className="size-3" />
          ) : (
            <WifiOff className="size-3" />
          )}
          {label}
          <span className="sm:hidden">
            {" "}
            ·{" "}
            {snapshot ? `${snapshot.participants.length} joined` : "Not joined"}
          </span>
        </span>
      </div>
      {!!plaza.error && !chooser && (
        <div className="z-20 shrink-0 border-b border-border bg-card px-3 py-2 text-xs">
          <ErrorNotice error={plaza.error} />
          <div className="mt-1 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void plaza.retry()}
            >
              Refresh room
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setChooser(true)}>
              Choose a room
            </Button>
          </div>
        </div>
      )}
      <main
        id="plaza-world"
        className="relative flex min-h-0 flex-1 flex-col p-0!"
      >
        <World
          room={room}
          snapshot={world}
          enabled={connected && !chooser && !drawer && !memberId && !offerId}
          onMove={plaza.move}
          onStop={plaza.stop}
          onSelect={(p) => setMemberId(p.participant_id)}
          onOffer={openOffer}
        />
      </main>
      {snapshot && snapshot.participants.filter((p) => p.bubble).length > 8 && (
        <Button
          variant="ghost"
          className="h-8! rounded-none! text-xs!"
          onClick={() => setDrawer(true)}
        >
          More speech bubbles in People & offers
        </Button>
      )}
      <BubbleComposer
        enabled={connected}
        offers={snapshot?.own_offers || []}
        onPost={plaza.publishBubble}
        onClear={plaza.clearBubble}
        hasBubble={!!own?.bubble}
      />
      <RoomChooser
        open={chooser}
        onOpenChange={setChooser}
        rooms={plaza.rooms.data?.rooms || []}
        busy={plaza.busy || loading}
        signedIn={!!session?.member && !session.member.suspended}
        current={snapshot?.room.slug}
        onJoin={plaza.join}
        onLeave={plaza.leave}
        error={plaza.rooms.error || plaza.error}
        retry={() => void plaza.rooms.refetch()}
      />
      <PeopleDrawer
        open={drawer}
        onOpenChange={setDrawer}
        snapshot={snapshot}
        onPerson={(p) => {
          setDrawer(false);
          setMemberId(p.participant_id);
        }}
        onOffer={openOffer}
        onMore={() =>
          navigate(
            `/explore?area=${encodeURIComponent(room.area.name)}&view=list`,
          )
        }
      />
      <MemberPopover
        person={member}
        offers={snapshot?.offers || []}
        onClose={() => setMemberId(null)}
        onOffer={openOffer}
        onReport={plaza.reportBubble}
        onHide={(id) => setHidden((old) => new Set([...old, id]))}
      />
      <OfferDialog offerId={offerId} onClose={() => setOfferId(null)} />
    </div>
  );
}
