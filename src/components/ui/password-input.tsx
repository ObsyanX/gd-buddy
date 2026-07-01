import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends Omit<InputProps, "type" | "rightSlot"> {
  showStrength?: boolean;
}

function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: "Empty" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const label = ["Too short", "Weak", "Fair", "Good", "Strong"][score] ?? "Weak";
  return { score: score as 0 | 1 | 2 | 3 | 4, label };
}

const barColor = ["bg-muted", "bg-destructive", "bg-amber-500", "bg-yellow-400", "bg-emerald-500"];

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = false, value, defaultValue, onChange, className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const [internal, setInternal] = React.useState<string>((defaultValue ?? "") as string);
    const isControlled = value !== undefined;
    const pw = (isControlled ? (value as string) : internal) ?? "";
    const { score, label } = React.useMemo(() => scorePassword(pw), [pw]);
    const strengthId = React.useId();

    return (
      <div className="space-y-1.5">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            if (!isControlled) setInternal(e.target.value);
            onChange?.(e);
          }}
          aria-describedby={showStrength ? strengthId : undefined}
          className={className}
          rightSlot={
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              className="pointer-events-auto grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary focus-ring"
              tabIndex={-1}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
          {...props}
        />
        {showStrength ? (
          <div id={strengthId} className="space-y-1" aria-live="polite">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-normal ease-editorial",
                    i < score ? barColor[score] : "bg-muted/50",
                  )}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Strength: <span className="font-medium text-foreground/80">{label}</span>
            </p>
          </div>
        ) : null}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
