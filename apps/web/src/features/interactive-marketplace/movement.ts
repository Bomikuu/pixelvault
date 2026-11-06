import type { Point, Trajectory, Direction } from "./types";
export function positionAt(t: Trajectory, now: number): Point {
  const r = t.duration_ms
    ? Math.max(0, Math.min(1, (now - t.started_at_ms) / t.duration_ms))
    : 1;
  return {
    x: t.start.x + (t.target.x - t.start.x) * r,
    y: t.start.y + (t.target.y - t.start.y) * r,
  };
}
export function directionTo(a: Point, b: Point): Direction {
  return Math.abs(b.x - a.x) > Math.abs(b.y - a.y)
    ? b.x >= a.x
      ? "right"
      : "left"
    : b.y >= a.y
      ? "down"
      : "up";
}
export function isMovementTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !target.closest(
      "input,textarea,select,[contenteditable=true],[role=dialog],[role=combobox],[data-no-walk]",
    )
  );
}
