import { useEffect, useRef, useState } from "react";
import { loadCarbon, onConsentGranted } from "@/lib/monetization";

interface Props {
  serve: string;
  placement: string;
  className?: string;
}

/** Privacy-friendly single-unit Carbon Ads placement. Renders nothing on failure. */
export function CarbonAdSlot({ serve, placement, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let done = false;
    const off = onConsentGranted(() => {
      if (done || !ref.current) return;
      done = true;
      loadCarbon(serve, placement, ref.current).catch(() => setFailed(true));
    });
    return off;
  }, [serve, placement]);

  if (failed) return null;
  return <div ref={ref} className={className} aria-label="Sponsored" />;
}
