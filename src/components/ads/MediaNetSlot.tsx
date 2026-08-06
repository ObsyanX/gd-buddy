import { useEffect, useId, useState } from "react";
import { loadMediaNet, onConsentGranted } from "@/lib/monetization";

interface Props {
  cid: string;
  /** Media.net ad unit crid from your dashboard. */
  crid: string;
  width?: number;
  height?: number;
  className?: string;
}

/** Consent-aware Media.net contextual ad unit. */
export function MediaNetSlot({ cid, crid, width = 336, height = 280, className }: Props) {
  const reactId = useId().replace(/[:]/g, "");
  const containerId = `mn-${crid}-${reactId}`;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const off = onConsentGranted(() => {
      loadMediaNet(cid)
        .then(() => {
          if (cancelled) return;
          const handle = (window as unknown as Record<string, any>)._mNHandle;
          handle?.queue?.push(() => {
            try {
              (window as unknown as Record<string, any>)._mNDetails?.loadTag(
                containerId,
                `${width}x${height}`,
                crid,
              );
            } catch {
              setFailed(true);
            }
          });
        })
        .catch(() => setFailed(true));
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [cid, crid, containerId, width, height]);

  if (failed) return null;
  return <div id={containerId} className={className} style={{ minHeight: height }} aria-label="Sponsored" />;
}
