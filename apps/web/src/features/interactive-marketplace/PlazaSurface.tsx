import { useEffect, useRef } from "react";
import type { Projection } from "./types";
export function PlazaSurface({
  onProjection,
  active,
}: {
  onProjection: (p: Projection) => void;
  active: boolean;
}) {
  const root = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!active || !root.current) return;
    const redraw = () => {
      const r = root.current!.getBoundingClientRect();
      onProjection({
        toScreen: (p) => ({
          x: (p.x * r.width) / 1000,
          y: (p.y * r.height) / 700,
        }),
        toWorld: (p) => ({
          x: (p.x * 1000) / r.width,
          y: (p.y * 700) / r.height,
        }),
      });
    };
    const observer = new ResizeObserver(redraw);
    observer.observe(root.current);
    redraw();
    return () => observer.disconnect();
  }, [active, onProjection]);
  return (
    <svg
      ref={root}
      aria-hidden="true"
      viewBox="0 0 1000 700"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full bg-secondary/30"
    >
      <defs>
        <pattern
          id="plaza-tiles"
          width="50"
          height="50"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M50 0H0V50"
            fill="none"
            stroke="currentColor"
            strokeWidth=".7"
            className="text-border"
          />
        </pattern>
      </defs>
      <rect width="1000" height="700" fill="url(#plaza-tiles)" />
      <path
        d="M0 220H360V0M1000 480H640V700M0 480H360V700M1000 220H640V0"
        strokeWidth="46"
        fill="none"
        className="stroke-background"
      />
      <path
        d="M0 350H1000M500 0V700"
        fill="none"
        strokeWidth="2"
        strokeDasharray="4 10"
        className="stroke-primary/15"
      />
      <rect
        x="422"
        y="285"
        width="156"
        height="130"
        rx="44"
        className="fill-primary/5 stroke-primary/15"
      />
      {[
        [150, 125],
        [825, 125],
        [150, 565],
        [825, 565],
      ].map(([x, y]) => (
        <g key={x + ":" + y} transform={`translate(${x} ${y})`}>
          <rect
            x="-40"
            y="-26"
            width="80"
            height="52"
            rx="22"
            className="fill-background stroke-border"
          />
          <ellipse rx="28" ry="20" className="fill-emerald-700/15" />
          <path
            d="M-18 1Q0-32 18 1Q0 24-18 1"
            className="fill-emerald-700/50"
          />
        </g>
      ))}
    </svg>
  );
}
