import * as React from "react";

import { cn } from "@/lib/utils";

type TextareaState = "default" | "error" | "success";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  state?: TextareaState;
}

const stateRing: Record<TextareaState, string> = {
  default:
    "border-input focus-visible:border-primary/60 focus-visible:ring-[color:var(--focus-ring)]",
  error:
    "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/40",
  success:
    "border-emerald-500/60 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30",
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, state = "default", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={state === "error" || undefined}
        data-state={state}
        className={cn(
          "flex min-h-[96px] w-full rounded-md border bg-background/60 px-3 py-2 text-sm backdrop-blur-sm",
          "transition-[border-color,box-shadow,background-color] duration-normal ease-editorial",
          "placeholder:text-muted-foreground hover:border-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          stateRing[state],
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
