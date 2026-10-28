import { Button } from "@pixelvault/ui";
import { Loader2, LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";
import type { MapAction } from "./geography";

export function MapControls({
  ready,
  locating,
  locate,
  command,
}: {
  ready: boolean;
  locating: boolean;
  locate?: () => void;
  command: (action: MapAction) => void;
}) {
  return (
    <div
      className={`absolute right-3 z-10 flex rounded-xl bg-card p-1 text-foreground shadow-md lg:bottom-8 lg:top-auto lg:flex-col ${ready ? "top-[40%]" : "bottom-3 top-auto"}`}
      role="group"
      aria-label="Map controls"
    >
      {locate && (
        <Button
          variant="ghost"
          size="icon"
          className="size-11!"
          aria-label={locating ? "Finding your location" : "Use my location"}
          title="Use my location"
          disabled={locating}
          onClick={locate}
        >
          {locating ? (
            <Loader2
              size={17}
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <LocateFixed size={17} />
          )}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-11!"
        aria-label="Zoom in"
        title="Zoom in"
        disabled={!ready}
        onClick={() => command("zoom-in")}
      >
        <Plus size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11!"
        aria-label="Zoom out"
        title="Zoom out"
        disabled={!ready}
        onClick={() => command("zoom-out")}
      >
        <Minus size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11!"
        aria-label={ready ? "Fit search area" : "Retry map"}
        title={ready ? "Fit search area" : "Retry map"}
        onClick={() => command(ready ? "reset" : "retry")}
      >
        <RotateCcw size={16} />
      </Button>
    </div>
  );
}
