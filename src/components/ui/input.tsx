import * as React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type InputState = "default" | "error" | "success" | "loading";

export interface InputProps extends React.ComponentProps<"input"> {
  state?: InputState;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const stateRing: Record<InputState, string> = {
  default:
    "border-input focus-visible:border-primary/60 focus-visible:ring-[color:var(--focus-ring)]",
  error:
    "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/40",
  success:
    "border-emerald-500/60 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30",
  loading:
    "border-input focus-visible:border-primary/60 focus-visible:ring-[color:var(--focus-ring)]",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, state = "default", leftIcon, rightSlot, disabled, ...props }, ref) => {
    const rightIndicator =
      state === "error" ? (
        <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
      ) : state === "success" ? (
        <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
      ) : state === "loading" ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        rightSlot ?? null
      );

    return (
      <div
        className={cn(
          "relative flex w-full items-center",
          disabled && "opacity-60 pointer-events-none",
        )}
      >
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 flex text-muted-foreground [&_svg]:size-4">
            {leftIcon}
          </span>
        ) : null}
        <input
          type={type}
          ref={ref}
          aria-invalid={state === "error" || undefined}
          aria-busy={state === "loading" || undefined}
          disabled={disabled}
          data-state={state}
          className={cn(
            "flex h-11 w-full rounded-md border bg-background/60 px-3 py-2 text-base md:text-sm",
            "backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-normal ease-editorial",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "hover:border-primary/40",
            stateRing[state],
            leftIcon && "pl-9",
            rightIndicator && "pr-9",
            className,
          )}
          {...props}
        />
        {rightIndicator ? (
          <span className="pointer-events-none absolute right-3 flex">{rightIndicator}</span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
