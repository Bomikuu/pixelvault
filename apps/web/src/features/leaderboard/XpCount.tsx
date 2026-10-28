import { useEffect, useRef, useState } from "react";

/** Only community XP: financial amounts must always render their exact value. */
export function XpCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const played = useRef(false);
  useEffect(() => {
    if (played.current || typeof window.requestAnimationFrame !== "function") {
      setDisplay(value);
      return;
    }
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (preference?.matches || document.hidden || value === 0) {
      played.current = true;
      setDisplay(value);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    let stopped = false;
    const finish = () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      setDisplay(value);
    };
    const onVisibility = () => {
      if (document.hidden) finish();
    };
    const onPreference = () => {
      if (preference?.matches) finish();
    };
    const tick = (time: number) => {
      if (stopped) return;
      played.current = true;
      start ??= time;
      const progress = Math.min((time - start) / 560, 1);
      setDisplay(Math.floor(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    setDisplay(0);
    frame = window.requestAnimationFrame(tick);
    preference?.addEventListener?.("change", onPreference);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      preference?.removeEventListener?.("change", onPreference);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [value]);
  return (
    <span
      className="podium-xp"
      aria-label={`${value.toLocaleString("en-PH")} community XP`}
    >
      <span aria-hidden="true">{display.toLocaleString("en-PH")}</span>
      <span aria-hidden="true"> XP</span>
    </span>
  );
}
