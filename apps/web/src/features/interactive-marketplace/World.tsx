import { useCallback, useEffect, useRef, useState } from "react";
import { Button, BadgeArt } from "@pixelvault/ui";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Layers,
  RefreshCw,
  MessageCircle,
  MapPin,
  HandCoins,
  ArrowUpRight,
  LocateFixed,
} from "lucide-react";
import { money } from "../../lib/format";
import { GoogleMapSurface } from "./GoogleMapSurface";
import { PlazaSurface } from "./PlazaSurface";
import { Sprite } from "./Sprite";
import { directionTo, positionAt } from "./movement";
import { useMovement } from "./useMovement";
import type {
  Room,
  Snapshot,
  Point,
  Participant,
  Projection,
  Direction,
} from "./types";

function Walker({
  person,
  projection,
  offset,
  selected,
  onSelect,
  onOffer,
  onPosition,
  showBubble,
}: {
  person: Participant;
  projection: Projection;
  offset: number;
  selected: boolean;
  onSelect: () => void;
  onOffer: (id: string) => void;
  onPosition: (p: Point) => void;
  showBubble: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState({
    direction: "down" as Direction,
    walking: false,
    frame: 0,
    visible: true,
  });
  const latest = useRef(onPosition);
  latest.current = onPosition;
  useEffect(() => {
    let frame = 0,
      disposed = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      if (disposed || document.hidden) return;
      const now = Date.now() + offset,
        p = positionAt(person.trajectory, now),
        screen = projection.toScreen(p);
      if (el.current)
        el.current.style.transform = `translate(${screen.x}px,${screen.y}px) translate(-50%,-100%)`;
      latest.current(p);
      const walking =
        now < person.trajectory.started_at_ms + person.trajectory.duration_ms;
      const direction = person.trajectory.duration_ms
        ? directionTo(person.trajectory.start, person.trajectory.target)
        : "down";
      const step = walking && !reduced ? Math.floor(now / 170) % 3 : 0;
      const visible = !person.bubble || person.bubble.expires_at_ms > now;
      setMotion((old) =>
        old.direction === direction &&
        old.walking === walking &&
        old.frame === step &&
        old.visible === visible
          ? old
          : { direction, walking, frame: step, visible },
      );
      if (walking) frame = requestAnimationFrame(tick);
    };
    tick();
    const expiry = person.bubble
      ? window.setTimeout(
          tick,
          Math.max(0, person.bubble.expires_at_ms - Date.now() - offset) + 20,
        )
      : 0;
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(expiry);
    };
  }, [person, projection, offset]);
  return (
    <div
      ref={el}
      className="pointer-events-none absolute top-0 left-0 z-10 flex w-36 flex-col items-center"
      style={{ transform: "translate(-200px,-200px)" }}
    >
      {person.bubble && motion.visible && showBubble && (
        <Button
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            person.bubble?.offer_id
              ? onOffer(person.bubble.offer_id)
              : onSelect();
          }}
          className="pointer-events-auto relative mb-2 h-auto! max-w-48 rounded-2xl! border-border! bg-card! px-3! py-2! text-left text-xs! font-semibold! leading-relaxed! whitespace-normal! text-foreground! shadow-md hover:border-primary! focus-visible:ring-2"
          aria-label={`Read ${person.person.display_name}'s bubble: ${person.bubble.text}`}
        >
          <span>
            {person.bubble.text}
            {person.bubble.offer_id && (
              <span className="mt-1 flex items-center gap-1 text-[10px] text-primary">
                View attached offer
                <ArrowUpRight className="size-3" />
              </span>
            )}
          </span>
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-1/2 size-2 rotate-45 border-r border-b border-border bg-card"
          />
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="pointer-events-auto relative h-auto! w-20 rounded-full! border-0! bg-transparent! p-0! hover:bg-primary/10!"
        aria-label={`Meet ${person.person.display_name}${selected ? ", you" : ""}`}
      >
        <span
          className={`absolute bottom-1 h-4 w-11 rounded-[50%] ${selected ? "border-2 border-primary bg-primary/15" : "bg-foreground/10"}`}
        />
        <Sprite
          seed={person.person.avatar_key || person.person.handle}
          direction={motion.direction}
          walking={motion.walking}
          frame={motion.frame}
        />
      </Button>
      <span className="mt-1 inline-flex max-w-36 items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-bold shadow-sm">
        <span className="size-1.5 shrink-0 rounded-full bg-emerald-600" />
        <span className="truncate">
          {selected ? "You" : person.person.display_name}
        </span>
        {person.person.reputation?.flair && (
          <BadgeArt badgeKey={person.person.reputation.flair.key} size={18} />
        )}
      </span>
    </div>
  );
}

export function World({
  room,
  snapshot,
  enabled,
  onMove,
  onStop,
  onSelect,
  onOffer,
}: {
  room: Room;
  snapshot: Snapshot | null;
  enabled: boolean;
  onMove: (p: Point) => void;
  onStop: () => void;
  onSelect: (p: Participant) => void;
  onOffer: (id: string) => void;
}) {
  const worldRef = useRef<HTMLDivElement>(null),
    position = useRef<Point>({ x: 500, y: 350 });
  const [projection, setProjection] = useState<Projection>({
      toScreen: (p) => p,
      toWorld: (p) => p,
    }),
    [mapReady, setMapReady] = useState(false),
    [attempt, setAttempt] = useState(0);
  const setProjectionStable = useCallback(
    (p: Projection) => setProjection(p),
    [],
  );
  const controls = useMovement({
    worldRef,
    enabled,
    position: () => position.current,
    onMove,
    onStop,
  });
  const walk = useRef(controls.walkTo);
  walk.current = controls.walkTo;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const destination = useCallback((p: Point) => {
    if (enabledRef.current) {
      worldRef.current?.focus();
      walk.current({
        x: Math.max(0, Math.min(1000, p.x)),
        y: Math.max(0, Math.min(700, p.y)),
      });
    }
  }, []);
  const start = useRef<Point | null>(null),
    offsetRef = useRef({ data: snapshot, offset: 0 });
  if (offsetRef.current.data !== snapshot)
    offsetRef.current = {
      data: snapshot,
      offset: snapshot ? snapshot.server_time_ms - Date.now() : 0,
    };
  const dpad = [
    { d: "up" as Direction, Icon: ArrowUp, grid: "col-start-2" },
    {
      d: "left" as Direction,
      Icon: ArrowLeft,
      grid: "row-start-2 col-start-1",
    },
    {
      d: "down" as Direction,
      Icon: ArrowDown,
      grid: "row-start-2 col-start-2",
    },
    {
      d: "right" as Direction,
      Icon: ArrowRight,
      grid: "row-start-2 col-start-3",
    },
  ];
  return (
    <div
      ref={worldRef}
      tabIndex={0}
      role="region"
      aria-label="Interactive city room. Focus here to walk with arrow keys or WASD."
      className="relative min-h-0 flex-1 overflow-hidden bg-background outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onStop();
      }}
      onPointerDown={(e) => {
        if (
          mapReady ||
          (e.target as HTMLElement).closest("button,input,[data-no-walk]")
        )
          return;
        start.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        if (mapReady || !start.current) return;
        const down = start.current;
        start.current = null;
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
        const r = e.currentTarget.getBoundingClientRect();
        destination(
          projection.toWorld({ x: e.clientX - r.left, y: e.clientY - r.top }),
        );
      }}
      onPointerCancel={() => {
        start.current = null;
        controls.release();
      }}
    >
      <PlazaSurface active={!mapReady} onProjection={setProjectionStable} />
      <GoogleMapSurface
        room={room}
        onProjection={setProjectionStable}
        onDestination={destination}
        onReady={setMapReady}
        attempt={attempt}
      />
      <div
        data-no-walk
        className="absolute bottom-12 left-3 z-20 hidden max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[11px] shadow-sm md:flex"
      >
        <Layers className="size-4 text-primary" />
        <span>{mapReady ? "Google Maps" : "Plaza view · Map unavailable"}</span>
        {mapReady && (
          <Button
            size="icon"
            variant="ghost"
            className="size-11! border-0! p-0!"
            aria-label="Find my character"
            onClick={() => projection.recenter?.(position.current)}
          >
            <LocateFixed className="size-4" />
          </Button>
        )}
        {!mapReady && !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
          <Button
            size="icon"
            variant="ghost"
            className="size-7! border-0! p-0!"
            aria-label="Retry map"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        )}
      </div>
      {!snapshot && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-72 rounded-2xl border border-border bg-card/95 px-6 py-5 text-center shadow-sm">
            <MessageCircle className="mx-auto mb-3 size-7 text-primary" />
            <h2 className="text-lg! font-bold!">
              A place to meet, person to person.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join a city room to walk around, share a bubble and discover
              offers.
            </p>
          </div>
        </div>
      )}
      {snapshot?.participants.map((p, i) => (
        <Walker
          key={p.participant_id}
          person={p}
          projection={projection}
          offset={offsetRef.current.offset}
          selected={p.participant_id === snapshot.self?.participant_id}
          onSelect={() => onSelect(p)}
          onOffer={onOffer}
          onPosition={(point) => {
            if (p.participant_id === snapshot.self?.participant_id)
              position.current = point;
          }}
          showBubble={
            i < 8 || p.participant_id === snapshot.self?.participant_id
          }
        />
      ))}
      {snapshot?.offers
        .filter(
          (o) =>
            !snapshot.participants.some(
              (p) => p.person.handle === o.lender.handle,
            ),
        )
        .slice(0, 6)
        .map((o, i) => {
          const p = projection.toScreen({
            x: 220 + (i % 3) * 280,
            y: i < 3 ? 140 : 570,
          });
          return (
            <Button
              key={o.id}
              variant="outline"
              className="absolute z-10 h-auto! max-w-40 flex-col! gap-1! rounded-xl! bg-card! px-3! py-2! text-[10px]! shadow-sm hover:border-primary!"
              style={{ left: p.x, top: p.y, transform: "translate(-50%,-50%)" }}
              onClick={(e) => {
                e.stopPropagation();
                onOffer(o.id);
              }}
              aria-label={`View ${o.lender.display_name}'s offer: ${o.title}`}
            >
              <span className="flex items-center gap-1.5">
                <HandCoins className="size-4 text-primary" />
                <strong>{money(o.declared_available_amount)}</strong>
              </span>
              <span className="max-w-32 truncate font-normal text-muted-foreground">
                {o.lender.display_name} · Offer board
              </span>
            </Button>
          );
        })}
      <div
        data-no-walk
        className="absolute right-3 bottom-8 z-20 grid grid-cols-3 gap-1 md:hidden"
      >
        {dpad.map(({ d, Icon, grid }) => (
          <Button
            key={d}
            variant="outline"
            className={`size-11! touch-none rounded-xl! bg-card! p-0! ${grid}`}
            aria-label={`Walk ${d}`}
            disabled={!enabled}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              controls.press(d);
            }}
            onPointerUp={controls.release}
            onPointerCancel={controls.release}
            onLostPointerCapture={controls.release}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                if (!e.repeat) controls.press(d);
              }
            }}
            onKeyUp={controls.release}
          >
            <Icon className="size-4" />
          </Button>
        ))}
      </div>
      <span className="pointer-events-none absolute bottom-3 left-3 z-20 inline-flex items-center gap-1 rounded-lg bg-card px-2 py-1 text-[10px] text-muted-foreground">
        <MapPin className="size-3" />
        <span className="hidden md:inline">Virtual room positions</span>
        <span className="md:hidden">
          {mapReady
            ? "Google Maps · Virtual positions"
            : "Plaza view · Map unavailable"}
        </span>
      </span>
      <span className="pointer-events-none absolute right-3 bottom-3 z-20 hidden rounded-lg bg-card px-2 py-1 text-[10px] text-muted-foreground md:inline">
        Click to walk · WASD / arrow keys
      </span>
    </div>
  );
}
