import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BrandMark,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@pixelvault/ui";
import {
  ArrowLeft,
  ChevronDown,
  Users,
  Wifi,
  WifiOff,
  Loader2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Megaphone,
} from "lucide-react";
import { ThemeToggle, legacyThemeClasses } from "../../app/ThemeToggle";
import { useSession } from "../../app/session";
import { ErrorNotice } from "../../components";
import { usePlaza } from "./usePlaza";
import { World } from "./World";
import { RoomChooser } from "./RoomChooser";
import { BubbleComposer } from "./BubbleComposer";
import { PeopleDrawer, PeopleList } from "./PeopleDrawer";
import { RoomChat } from "./RoomChat";
import { MemberPopover } from "./MemberPopover";
import { OfferDialog } from "./OfferDialog";
import type { Room, Participant } from "./types";
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
    [overlay, setOverlay] = useState<"chat" | "people" | null>(null),
    [chatExpanded, setChatExpanded] = useState(true),
    [peopleExpanded, setPeopleExpanded] = useState(true),
    [compose, setCompose] = useState(false),
    [memberId, setMemberId] = useState<string | null>(null),
    [offerId, setOfferId] = useState<string | null>(null),
    [hidden, setHidden] = useState<Set<string>>(() => new Set()),
    [lastRoom, setLastRoom] = useState(INITIAL_ROOM);
  const stopRef = useRef(plaza.stop);
  stopRef.current = plaza.stop;
  useEffect(() => {
    if (chooser || overlay || compose || memberId || offerId) stopRef.current();
  }, [chooser, overlay, compose, memberId, offerId]);
  useEffect(() => {
    const screen = window.matchMedia("(min-width: 1024px)");
    const change = () => {
      if (screen.matches) setOverlay(null);
    };
    screen.addEventListener("change", change);
    return () => screen.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    setCompose(false);
    setOverlay(null);
    setMemberId(null);
    setOfferId(null);
    setHidden(new Set());
  }, [session?.member?.id, plaza.snapshot?.room.slug]);
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
    setOverlay(null);
    setMemberId(null);
    setOfferId(id);
  };
  const showPeople = () => {
    if (window.matchMedia("(min-width: 1024px)").matches)
      setPeopleExpanded((v) => !v);
    else setOverlay("people");
  };
  const selectPerson = (p: Participant) => {
    setOverlay(null);
    setMemberId(p.participant_id);
  };
  const moreOffers = () =>
    navigate(`/explore?area=${encodeURIComponent(room.area.name)}&view=list`);
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
      <header className="z-30 flex min-h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4">
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
          onClick={showPeople}
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
        <span className="inline-flex items-center gap-2">
          <Megaphone className="size-3.5 shrink-0" />
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
          enabled={
            connected &&
            !chooser &&
            !overlay &&
            !compose &&
            !memberId &&
            !offerId
          }
          onMove={plaza.move}
          onStop={plaza.stop}
          onSelect={selectPerson}
          onOffer={openOffer}
        />
        <aside
          id="room-chat-panel"
          aria-label="Room chat"
          className={`absolute top-3 left-3 z-30 hidden h-[min(32rem,calc(100%-7rem))] w-64 flex-col rounded-2xl border border-border bg-card p-3 shadow-lg shadow-foreground/5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-200 xl:w-68 ${chatExpanded ? "lg:flex" : ""}`}
        >
          <div className="mb-3 flex shrink-0 items-center gap-2.5">
            <MessageCircle className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm! font-extrabold!">Room chat</h2>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {snapshot ? room.name : "Choose a city room"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-11! shrink-0 p-0!"
              aria-label="Collapse room chat"
              onClick={() => setChatExpanded(false)}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </div>
          <RoomChat
            snapshot={world}
            enabled={connected}
            onCompose={() => setCompose(true)}
            onPerson={selectPerson}
            onOffer={openOffer}
          />
        </aside>
        <Button
          variant="outline"
          className={`absolute top-3 left-3 z-30 min-h-11! bg-card! shadow-sm ${chatExpanded ? "lg:hidden!" : ""}`}
          aria-label="Open room chat"
          aria-controls="room-chat-panel"
          onClick={() => {
            if (window.matchMedia("(min-width: 1024px)").matches)
              setChatExpanded(true);
            else setOverlay("chat");
          }}
        >
          <MessageCircle className="size-4 text-primary" />
          <span className="text-xs">Room chat</span>
          <ChevronRight className="size-3.5" />
        </Button>
        <aside
          id="room-people-panel"
          aria-label="People and offers"
          className={`absolute top-3 right-3 z-30 hidden h-[min(30rem,calc(100%-7rem))] w-64 flex-col rounded-2xl border border-border bg-card p-3 shadow-lg shadow-foreground/5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-200 xl:w-72 ${peopleExpanded ? "lg:flex" : ""}`}
        >
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <h2 className="text-sm! font-extrabold!">People & offers</h2>
            <Button
              variant="ghost"
              size="icon"
              className="size-11! shrink-0 p-0!"
              aria-label="Collapse people and offers"
              onClick={() => setPeopleExpanded(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <PeopleList
            snapshot={world}
            onPerson={selectPerson}
            onOffer={openOffer}
            onMore={moreOffers}
          />
        </aside>
        {!peopleExpanded && (
          <Button
            variant="outline"
            className="absolute top-3 right-3 z-30 hidden! min-h-11! bg-card! shadow-sm lg:inline-flex!"
            aria-label="Show people and offers panel"
            onClick={() => setPeopleExpanded(true)}
          >
            <Users className="size-4 text-primary" />
            <ChevronLeft className="size-3.5" />
          </Button>
        )}
        <Button
          className={`absolute bottom-10 left-3 z-30 min-h-11! gap-2! rounded-xl! shadow-lg shadow-primary/15 lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 ${chatExpanded && connected ? "lg:hidden!" : ""}`}
          onClick={() => (connected ? setCompose(true) : setChooser(true))}
        >
          <Send className="size-4" />
          {connected ? "Post bubble" : "Join the conversation"}
        </Button>
      </main>
      <BubbleComposer
        key={`${session?.member?.id || "guest"}:${room.slug}`}
        open={compose}
        onOpenChange={setCompose}
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
        open={overlay === "people"}
        onOpenChange={(open) => setOverlay(open ? "people" : null)}
        snapshot={world}
        onPerson={selectPerson}
        onOffer={openOffer}
        onMore={moreOffers}
      />
      <Dialog
        open={overlay === "chat"}
        onOpenChange={(open) => setOverlay(open ? "chat" : null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)]! max-w-md! grid-cols-[minmax(0,1fr)]! overflow-hidden! p-4! [&>*]:min-w-0">
          <DialogTitle className="pr-8 text-lg!">Room chat</DialogTitle>
          <DialogDescription className="text-xs!">
            {room.name} · Current public bubbles
          </DialogDescription>
          <div
            className="flex min-h-0 flex-col"
            style={{ height: "min(30rem, calc(100dvh - 12rem))" }}
          >
            <RoomChat
              snapshot={world}
              enabled={connected}
              onCompose={() => {
                setOverlay(null);
                setCompose(true);
              }}
              onPerson={selectPerson}
              onOffer={openOffer}
            />
          </div>
        </DialogContent>
      </Dialog>
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
