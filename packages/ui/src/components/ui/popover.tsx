import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@ui/lib/utils";

// Canonical composition follows Shadcn's Radix Popover:
// https://ui.shadcn.com/docs/components/radix/popover
// https://www.radix-ui.com/primitives/docs/components/popover
export function Popover(
  props: React.ComponentProps<typeof PopoverPrimitive.Root>,
) {
  return <PopoverPrimitive.Root {...props} />;
}
export function PopoverTrigger(
  props: React.ComponentProps<typeof PopoverPrimitive.Trigger>,
) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}
export function PopoverAnchor(
  props: React.ComponentProps<typeof PopoverPrimitive.Anchor>,
) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}
export function PopoverClose(
  props: React.ComponentProps<typeof PopoverPrimitive.Close>,
) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}
export function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  collisionPadding = 12,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-50 rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
