import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium",
    "transition-[transform,box-shadow,background-color,color,filter] duration-normal ease-editorial",
    "focus-ring tap gpu",
    "disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50",
    "aria-[busy=true]:cursor-progress",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-gradient-copper text-primary-foreground shadow-copper hover:brightness-110 hover:-translate-y-0.5 hover:shadow-premium active:brightness-95",
        premium:
          "bg-gradient-copper text-primary-foreground shadow-copper hover:brightness-110 hover:-translate-y-0.5 hover:shadow-premium active:brightness-95",
        glass:
          "glass-1 text-foreground hover:glass-2 hover:border-primary/40 active:glass-3",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-primary/40 bg-transparent text-foreground hover:bg-primary/10 hover:border-primary/70 active:bg-primary/15",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost:
          "text-foreground hover:bg-primary/10 hover:text-primary-glow active:bg-primary/15",
        "ghost-copper":
          "text-primary hover:text-primary-glow hover:bg-primary/10 active:bg-primary/15",
        link:
          "text-primary underline-offset-4 hover:underline hover:text-primary-glow",
      },
      size: {
        default: "h-11 px-6 py-2 min-h-11",
        sm: "h-9 rounded-full px-4 min-h-9 text-[13px]",
        lg: "h-14 rounded-full px-9 text-base",
        xl: "h-16 rounded-full px-12 text-lg",
        icon: "h-11 w-11 min-h-11 min-w-11",
        "icon-sm": "h-9 w-9 min-h-9 min-w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
