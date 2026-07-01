import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
<ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport
      className="h-full w-full rounded-[inherit] [-webkit-overflow-scrolling:touch] [touch-action:pan-y] [overscroll-behavior:contain]"
    >
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
    className={cn(
      "flex select-none transition-colors data-[state=visible]:animate-in data-[state=hidden]:animate-out",
      // Always visible; do NOT set touch-none on mobile so swipes over the thumb still scroll the viewport
      orientation === "vertical" && "h-full w-1.5 border-l border-l-transparent p-[1px] lg:w-2 touch-auto lg:touch-none",
      orientation === "horizontal" && "h-1.5 flex-col border-t border-t-transparent p-[1px] lg:h-2 touch-auto lg:touch-none",
      className,
    )}
    {...props}
  >

    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-primary/50 hover:bg-primary/70 transition-colors before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:h-full before:min-h-11 before:w-full before:min-w-11" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
