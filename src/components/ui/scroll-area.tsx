import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} type="always" className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] [-webkit-overflow-scrolling:touch] [touch-action:pan-y] [overscroll-behavior:contain]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar forceMount />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    // On touch devices the visible bar must not sit above the viewport and steal pan gestures.
    // Keep it visual on mobile; restore pointer dragging on large screens.
    className={cn(
      "flex select-none touch-none pointer-events-none lg:pointer-events-auto transition-opacity z-20",
      orientation === "vertical" && "h-full w-2.5 border-l border-border/40 bg-secondary/40 p-0.5 ",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-border/60 bg-secondary/40 p-0/5 ",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-primary/80 hover:bg-primary active:bg-primary transition-colors min-h-[32px] shadow-sm" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
