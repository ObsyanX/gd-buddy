import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon, LucideProps } from "lucide-react";

/**
 * Phase 12 — Iconography
 * Semantic Icon wrapper that enforces sizing/tone tokens across the app.
 *
 * Rules:
 *  - Never set arbitrary px sizes on lucide icons in feature code; use `size`.
 *  - Never colour icons with hex; use `tone` (maps to CSS tokens).
 *  - Icon-only interactive elements MUST pass `label` (mapped to aria-label);
 *    decorative icons default to aria-hidden.
 */

export const ICON_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
} as const;
export type IconSize = keyof typeof ICON_SIZE;

export const ICON_TONE = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  accent: "text-[hsl(var(--primary-glow))]",
  success: "text-[hsl(var(--success))]",
  warning: "text-[hsl(var(--warning))]",
  destructive: "text-destructive",
  inverse: "text-primary-foreground",
} as const;
export type IconTone = keyof typeof ICON_TONE;

export interface IconProps extends Omit<LucideProps, "size" | "ref" | "color"> {
  as: LucideIcon;
  size?: IconSize;
  tone?: IconTone;
  /** If provided, renders an accessible label and drops aria-hidden. */
  label?: string;
  /** Visual chrome — wraps the icon in a token-styled container. */
  chrome?: "none" | "chip" | "circle" | "square";
  strokeWidth?: number;
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  (
    { as: LucideCmp, size = "md", tone = "default", label, chrome = "none", strokeWidth = 1.75, className, ...rest },
    ref,
  ) => {
    const px = ICON_SIZE[size];
    const svg = (
      <LucideCmp
        ref={ref}
        aria-hidden={label ? undefined : true}
        aria-label={label}
        role={label ? "img" : undefined}
        focusable={false}
        width={px}
        height={px}
        strokeWidth={strokeWidth}
        className={cn("shrink-0", ICON_TONE[tone], className)}
        {...rest}
      />
    );

    if (chrome === "none") return svg;

    const box =
      chrome === "chip"
        ? "px-2 py-1 rounded-lg glass-copper"
        : chrome === "circle"
          ? "rounded-full glass-copper size-9"
          : "rounded-xl glass-copper size-9";

    return (
      <span className={cn("inline-flex items-center justify-center", box)} data-icon-chrome={chrome}>
        {svg}
      </span>
    );
  },
);
Icon.displayName = "Icon";
