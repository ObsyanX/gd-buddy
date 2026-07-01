import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Phase 12 — Illustration
 * Semantic slot for decorative artwork (SVG, PNG, or inline React nodes).
 *
 * Use `<Illustration>` for hero/marketing surfaces, empty-state art, and
 * feature callouts. It handles:
 *  - Ambient copper glow backdrop (`glow` prop)
 *  - Reduced-motion aware float animation (`float`)
 *  - Aspect-ratio locking (`aspect`)
 *  - Correct ARIA (decorative vs meaningful via `alt`)
 */

type Aspect = "square" | "video" | "portrait" | "wide" | "auto";

const ASPECT: Record<Aspect, string> = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[16/9]",
  auto: "",
};

export interface IllustrationProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image URL. If omitted, `children` is rendered instead (e.g., inline SVG). */
  src?: string;
  /** Meaningful description. Empty string marks the image decorative. */
  alt?: string;
  aspect?: Aspect;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  glow?: boolean;
  float?: boolean;
  rounded?: "none" | "md" | "lg" | "xl" | "2xl" | "full";
  fit?: "cover" | "contain";
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
}

const SIZE_MAX: Record<NonNullable<IllustrationProps["size"]>, string> = {
  sm: "max-w-[160px]",
  md: "max-w-[260px]",
  lg: "max-w-[400px]",
  xl: "max-w-[560px]",
  full: "w-full",
};

const ROUND: Record<NonNullable<IllustrationProps["rounded"]>, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

export const Illustration = React.forwardRef<HTMLDivElement, IllustrationProps>(
  (
    {
      src,
      alt = "",
      aspect = "square",
      size = "md",
      glow = false,
      float = false,
      rounded = "2xl",
      fit = "contain",
      loading = "lazy",
      fetchPriority = "auto",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const prefersReduced = useReducedMotion();
    const isDecorative = alt === "";

    return (
      <div
        ref={ref}
        className={cn("relative inline-block", SIZE_MAX[size], className)}
        {...props}
      >
        {glow && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-70",
              "bg-[radial-gradient(closest-side,hsl(var(--primary)/0.35),transparent_70%)]",
            )}
          />
        )}
        <motion.div
          className={cn(
            "relative overflow-hidden",
            ASPECT[aspect],
            ROUND[rounded],
            "flex items-center justify-center",
          )}
          animate={
            float && !prefersReduced
              ? { y: [0, -8, 0], rotate: [0, 0.4, 0] }
              : undefined
          }
          transition={
            float && !prefersReduced
              ? { duration: 6, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        >
          {src ? (
            <img
              src={src}
              alt={alt}
              aria-hidden={isDecorative || undefined}
              loading={loading}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({ fetchpriority: fetchPriority } as any)}
              draggable={false}
              className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")}
            />
          ) : (
            children
          )}
        </motion.div>
      </div>
    );
  },
);
Illustration.displayName = "Illustration";
