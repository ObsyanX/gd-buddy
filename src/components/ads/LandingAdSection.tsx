import { AdNetworkSlot } from "@/components/ads/AdNetworkSlot";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import type { AdNetwork } from "@/lib/monetization";

/**
 * Consent-aware sponsored unit below the resources section on the landing page.
 * The active network is chosen in Admin → Settings (`ads.network`), with the
 * per-network credentials in the matching `ads.*` flags. Nothing renders until
 * a network is configured, so this is safe to ship pre-approval.
 */
export function LandingAdSection() {
  const network = useFeatureFlag<AdNetwork>("ads.network", "adsense");
  const adsenseSlot = useFeatureFlag<string>("ads.landing_page_ad_slot", "");
  const mnCid = useFeatureFlag<string>("ads.medianet_cid", "");
  const carbonServe = useFeatureFlag<string>("ads.carbon_serve", "");
  const ezoicId = useFeatureFlag<number>("ads.ezoic_placeholder_id", 0);

  const configured =
    (network === "adsense" && !!adsenseSlot?.trim()) ||
    (network === "medianet" && !!mnCid?.trim()) ||
    (network === "carbon" && !!carbonServe?.trim()) ||
    (network === "ezoic" && !!ezoicId);

  if (!configured) return null;

  return (
    <section className="container mx-auto px-4 md:px-6 py-10" aria-label="Sponsored resource">
      <div className="max-w-3xl mx-auto">
        <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-3">
          Sponsored
        </p>
        <div className="min-h-[250px] rounded-2xl border border-border/60 bg-muted/20 p-2 flex items-center justify-center">
          <AdNetworkSlot slotId="landing-footer" className="w-full" />
        </div>
      </div>
    </section>
  );
}
