import { useEffect, useRef } from "react";
import {
  ADSENSE_CLIENT,
  registerSlot,
  reportSlotFillState,
} from "@/lib/adsense";

interface GoogleAdSlotProps {
  /** AdSense ad slot ID (from AdSense dashboard). */
  adSlot: string;
  /** Optional stable identifier for diagnostics. */
  slotId?: string;
  format?: string;
  fullWidthResponsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Renders a single Google AdSense <ins> slot with consent-aware initialisation
 * and fill/unfilled reporting to the diagnostics bus.
 *
 * NOTE: distinct from the app's internal AdSlot (which serves first-party
 * advertisements from Supabase). This one wraps Google AdSense specifically.
 */
export function GoogleAdSlot({
  adSlot,
  slotId,
  format = "auto",
  fullWidthResponsive = true,
  style,
  className,
}: GoogleAdSlotProps) {
  const insRef = useRef<HTMLModElement | null>(null);
  const id = slotId ?? `slot-${adSlot}`;

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    registerSlot(id, adSlot, () => {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle ?? [];
      (w.adsbygoogle as unknown[]).push({});
    });

    const observer = new MutationObserver(() => {
      const status = el.getAttribute("data-ad-status");
      if (status === "filled") reportSlotFillState(id, true);
      else if (status === "unfilled") reportSlotFillState(id, false);
    });
    observer.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => observer.disconnect();
  }, [adSlot, id]);

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className ?? ""}`}
      style={{ display: "block", ...style }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={adSlot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}
