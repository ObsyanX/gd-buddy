import { useEffect, useState } from "react";
import { GoogleAdSlot } from "@/components/ads/GoogleAdSlot";
import { MediaNetSlot } from "@/components/ads/MediaNetSlot";
import { CarbonAdSlot } from "@/components/ads/CarbonAdSlot";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { loadEzoic, onConsentGranted, type AdNetwork } from "@/lib/monetization";

interface Props {
  /** Stable id used for AdSense diagnostics + Ezoic placeholder identity. */
  slotId: string;
  className?: string;
}

/**
 * Network-agnostic ad placement.
 *
 * Admins pick the active network with the `ads.network` flag
 * (`adsense` | `medianet` | `ezoic` | `carbon` | `none`). Each network reads its
 * own credential flags, and the slot renders nothing when the active network is
 * unconfigured — so the page never shows an empty ad frame.
 */
export function AdNetworkSlot({ slotId, className }: Props) {
  const network = useFeatureFlag<AdNetwork>("ads.network", "adsense");

  const adsenseSlot = useFeatureFlag<string>("ads.landing_page_ad_slot", "");
  const mnCid = useFeatureFlag<string>("ads.medianet_cid", "");
  const mnCrid = useFeatureFlag<string>("ads.medianet_crid", "");
  const carbonServe = useFeatureFlag<string>("ads.carbon_serve", "");
  const carbonPlacement = useFeatureFlag<string>("ads.carbon_placement", "");
  const ezoicId = useFeatureFlag<number>("ads.ezoic_placeholder_id", 0);

  const [ezoicReady, setEzoicReady] = useState(false);
  useEffect(() => {
    if (network !== "ezoic" || !ezoicId) return;
    const off = onConsentGranted(() => {
      loadEzoic()
        .then(() => {
          const w = window as unknown as Record<string, any>;
          w.ezstandalone?.cmd?.push(() => {
            try {
              w.ezstandalone.showAds(Number(ezoicId));
              setEzoicReady(true);
            } catch { /* ignore */ }
          });
        })
        .catch(() => { /* ignore */ });
    });
    return off;
  }, [network, ezoicId]);

  if (network === "none") return null;

  if (network === "medianet") {
    if (!mnCid?.trim() || !mnCrid?.trim()) return null;
    return <MediaNetSlot cid={mnCid.trim()} crid={mnCrid.trim()} className={className} />;
  }

  if (network === "carbon") {
    if (!carbonServe?.trim() || !carbonPlacement?.trim()) return null;
    return <CarbonAdSlot serve={carbonServe.trim()} placement={carbonPlacement.trim()} className={className} />;
  }

  if (network === "ezoic") {
    if (!ezoicId) return null;
    return (
      <div className={className} data-ezoic-ready={ezoicReady ? "1" : "0"}>
        <div id={`ezoic-pub-ad-placeholder-${ezoicId}`} />
      </div>
    );
  }

  // default: adsense
  if (!adsenseSlot?.trim()) return null;
  return (
    <GoogleAdSlot
      adSlot={adsenseSlot.trim()}
      slotId={slotId}
      format="auto"
      fullWidthResponsive
      className={className}
    />
  );
}
