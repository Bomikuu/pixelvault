import { useEffect, useRef } from "react";
import type { Point, Direction } from "./types";
import { isMovementTarget } from "./movement";
export function useMovement({
  worldRef,
  enabled,
  position,
  onMove,
  onStop,
}: {
  worldRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  position: () => Point;
  onMove: (p: Point) => void;
  onStop: () => void;
}) {
  const latest = useRef({ position, onMove, onStop });
  latest.current = { position, onMove, onStop };
  const held = useRef(new Set<Direction>()),
    wasMoving = useRef(false);
  const stop = () => {
    held.current.clear();
    if (wasMoving.current) {
      wasMoving.current = false;
      latest.current.onStop();
    }
  };
  const step = () => {
    if (!held.current.size) return;
    const p = latest.current.position();
    let dx = 0,
      dy = 0;
    held.current.forEach((d) => {
      if (d === "up") dy--;
      if (d === "down") dy++;
      if (d === "left") dx--;
      if (d === "right") dx++;
    });
    if (!dx && !dy) return;
    wasMoving.current = true;
    const length = Math.hypot(dx, dy);
    latest.current.onMove({
      x: Math.min(1000, Math.max(0, p.x + (dx / length) * 180)),
      y: Math.min(700, Math.max(0, p.y + (dy / length) * 180)),
    });
  };
  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    const keys: Record<string, Direction> = {
      w: "up",
      ArrowUp: "up",
      s: "down",
      ArrowDown: "down",
      a: "left",
      ArrowLeft: "left",
      d: "right",
      ArrowRight: "right",
    };
    const down = (e: KeyboardEvent) => {
      const d = keys[e.key];
      if (
        !d ||
        !isMovementTarget(e.target) ||
        !worldRef.current?.contains(document.activeElement)
      )
        return;
      e.preventDefault();
      if (!held.current.has(d)) {
        held.current.add(d);
        step();
      }
    };
    const up = (e: KeyboardEvent) => {
      const d = keys[e.key];
      if (!d || !held.current.has(d)) return;
      e.preventDefault();
      held.current.delete(d);
      if (!held.current.size) stop();
      else step();
    };
    const blur = () => stop();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    const timer = window.setInterval(step, 350);
    return () => {
      stop();
      clearInterval(timer);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [enabled]);
  return {
    press: (direction: Direction) => {
      if (!enabled) return;
      held.current.add(direction);
      step();
    },
    walkTo: (p: Point) => {
      if (!enabled) return;
      wasMoving.current = true;
      latest.current.onMove(p);
    },
    release: stop,
  };
}
