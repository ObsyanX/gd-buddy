import { forwardRef, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Mark true for hero/LCP images — sets fetchPriority=high & eager loading. */
  priority?: boolean;
  /** Locks the aspect box to prevent CLS. Any Tailwind aspect-* utility. */
  aspect?: string;
  /** Optional rounded / object-fit convenience. */
  rounded?: string;
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}

/**
 * Phase 14 — image pipeline primitive.
 * - Locks aspect ratio (CLS = 0)
 * - `decoding="async"` + `loading="lazy"` by default
 * - Hero images opt-in via `priority` (fetchPriority=high, loading=eager)
 * - Native `srcSet`/`sizes` pass-through
 */
export const SmartImage = forwardRef<HTMLImageElement, SmartImageProps>(
  (
    { className, priority, aspect, rounded, fit = "cover", alt = "", ...rest },
    ref,
  ) => {
    const img = (
      <img
        ref={ref}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        // @ts-expect-error React 18 accepts fetchpriority via lowercase attr
        fetchpriority={priority ? "high" : "auto"}
        className={cn(
          "block h-full w-full",
          `object-${fit}`,
          rounded,
          !aspect && className,
        )}
        {...rest}
      />
    );
    if (!aspect) return img;
    return (
      <div className={cn("overflow-hidden", aspect, rounded, className)}>
        {img}
      </div>
    );
  },
);
SmartImage.displayName = "SmartImage";
