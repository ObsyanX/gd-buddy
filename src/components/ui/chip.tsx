import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  [
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
    "transition-[transform,box-shadow,background-color,color,border-color] duration-normal ease-editorial",
    "focus-ring tap gpu",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-3.5 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-surface/60 text-foreground border border-border/60 hover:border-primary/50 hover:bg-primary/5",
        solid:
          "bg-gradient-copper text-primary-foreground shadow-copper hover:brightness-110",
        glass:
          "glass-1 text-foreground hover:glass-2 hover:border-primary/40",
        outline:
          "border border-primary/40 text-primary hover:bg-primary/10",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-primary/5",
        success: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
        warning: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
        destructive: "bg-destructive/15 text-destructive border border-destructive/30",
      },
      size: {
        sm: "h-6 px-2 text-[11px]",
        default: "h-8 px-3 text-xs",
        lg: "h-10 px-4 text-sm",
      },
      interactive: {
        true: "cursor-pointer active:scale-[0.96] hover:-translate-y-0.5",
        false: "",
      },
      selected: {
        true: "ring-1 ring-primary/60",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
      selected: false,
    },
  },
);

export interface ChipProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "onSelect">,
    VariantProps<typeof chipVariants> {
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  (
    { className, variant, size, interactive, selected, asChild, leftIcon, onRemove, removeLabel = "Remove", children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "span";
    return (
      <Comp
        ref={ref as any}
        data-selected={selected || undefined}
        className={cn(chipVariants({ variant, size, interactive, selected }), className)}
        {...props}
      >
        {leftIcon}
        <span>{children}</span>
        {onRemove ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={removeLabel}
            className="-mr-1 ml-0.5 grid size-4 place-items-center rounded-full opacity-70 transition hover:bg-foreground/10 hover:opacity-100 focus-ring"
          >
            <X className="!size-3" aria-hidden="true" />
          </button>
        ) : null}
      </Comp>
    );
  },
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
