import { FRONT, PALETTES } from "./spriteData";
import type { Direction } from "./types";
export function Sprite({
  seed,
  direction = "down",
  frame = 0,
  walking = false,
}: {
  seed: string;
  direction?: Direction;
  frame?: number;
  walking?: boolean;
}) {
  const palette =
    PALETTES[
      Array.from(seed).reduce((sum, c) => sum + c.charCodeAt(0), 0) %
        PALETTES.length
    ];
  const paths: Record<string, string> = {};
  FRONT.forEach((row, y) =>
    Array.from(row).forEach((char, x) => {
      if (char === ".") return;
      let key = char;
      if (direction === "up" && y < 8) key = y < 6 ? "1" : "2";
      if ((direction === "right" || direction === "left") && y < 8 && x < 8)
        key = "1";
      const step =
        walking && y > 17
          ? (x < 10 ? 1 : -1) * (frame === 1 ? 1 : frame === 2 ? -1 : 0)
          : 0;
      paths[key] = (paths[key] || "") + `M${x} ${y + step}h1v1h-1z`;
    }),
  );
  return (
    <svg
      aria-hidden="true"
      width="52"
      height="68"
      viewBox="0 0 24 30"
      className="size-auto! overflow-visible [image-rendering:pixelated]"
      style={{ width: 52, height: 68 }}
      shapeRendering="crispEdges"
    >
      <g
        transform={
          direction === "left"
            ? "translate(23 2) scale(-1 1)"
            : "translate(2 2)"
        }
      >
        {Object.entries(paths).map(([key, d]) => (
          <path key={key} fill={palette[Number(key)]} d={d} />
        ))}
      </g>
    </svg>
  );
}
