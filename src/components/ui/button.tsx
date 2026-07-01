import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-normal ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-copper text-primary-foreground shadow-copper hover:brightness-110 hover:-translate-y-0.5",
        premium:
          "bg-gradient-copper text-primary-foreground shadow-copper hover:brightness-110 hover:-translate-y-0.5 hover:shadow-premium",
        glass:
          "glass text-foreground hover:bg-surface/70 hover:border-primary/40",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-primary/40 bg-transparent text-foreground hover:bg-primary/10 hover:border-primary/70",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-foreground hover:bg-primary/10 hover:text-primary-glow",
        "ghost-copper":
          "text-primary hover:text-primary-glow hover:bg-primary/10",
        link:
          "text-primary underline-offset-4 hover:underline hover:text-primary-glow",
      },
      size: {
        default: "h-11 px-6 py-2 min-h-11",
        sm: "h-9 rounded-full px-4 min-h-9",
        lg: "h-14 rounded-full px-9 text-base",
        xl: "h-16 rounded-full px-12 text-lg",
        icon: "h-11 w-11 min-h-11 min-w-11",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
