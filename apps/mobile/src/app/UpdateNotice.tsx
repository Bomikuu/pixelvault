import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@pixelvault/ui";
export function UpdateNotice() {
  const [ready, setReady] = useState(false),
    [apply, setApply] = useState<null | (() => Promise<void>)>(null);
  useEffect(() => {
    if (
      !import.meta.env.PROD ||
      import.meta.env.MODE === "native" ||
      Capacitor.isNativePlatform() ||
      !("serviceWorker" in navigator)
    )
      return;
    let active = true;
    void import("virtual:pwa-register").then(({ registerSW }) => {
      if (!active) return;
      const update = registerSW({
        onNeedRefresh: () => setReady(true),
        onRegisterError: () => {},
      });
      setApply(() => async () => {
        await update(true);
      });
    });
    return () => {
      active = false;
    };
  }, []);
  if (!ready) return null;
  return (
    <aside
      role="status"
      aria-label="App update"
      className="fixed right-4 bottom-28 left-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <p className="text-sm font-bold">A new version is ready.</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Finish any request or agreement review first. Reloading clears this
        screen’s unsaved input.
      </p>
      <div className="mt-3 flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setReady(false)}
        >
          Later
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            void apply?.();
          }}
        >
          Reload app
        </Button>
      </div>
    </aside>
  );
}
