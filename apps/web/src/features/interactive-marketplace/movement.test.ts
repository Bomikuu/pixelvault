import { describe, it, expect } from "vitest";
import { positionAt, directionTo, isMovementTarget } from "./movement";
describe("virtual movement", () => {
  it("matches the server trajectory and clamps time", () => {
    const t = {
      start: { x: 0, y: 0 },
      target: { x: 120, y: 0 },
      started_at_ms: 0,
      duration_ms: 1000,
      sequence: 1,
    };
    expect(positionAt(t, 500)).toEqual({ x: 60, y: 0 });
    expect(positionAt(t, 2000)).toEqual(t.target);
    expect(positionAt(t, -1)).toEqual(t.start);
  });
  it("keeps text input and dialog interaction out of game keys", () => {
    const input = document.createElement("input");
    const dialog = document.createElement("div");
    dialog.role = "dialog";
    const child = document.createElement("span");
    dialog.append(child);
    expect(isMovementTarget(input)).toBe(false);
    expect(isMovementTarget(child)).toBe(false);
  });
  it("distinguishes four directions", () => {
    expect(directionTo({ x: 0, y: 0 }, { x: 50, y: 0 })).toBe("right");
    expect(directionTo({ x: 50, y: 0 }, { x: 0, y: 0 })).toBe("left");
    expect(directionTo({ x: 0, y: 50 }, { x: 0, y: 0 })).toBe("up");
    expect(directionTo({ x: 0, y: 0 }, { x: 0, y: 50 })).toBe("down");
  });
});
