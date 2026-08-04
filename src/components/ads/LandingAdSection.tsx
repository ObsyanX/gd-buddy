import { GoogleAdSlot } from "@/components/ads/GoogleAdSlot";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

/**
 * A consent-aware AdSense unit that appears below the resources section on the
 * landing page. The slot ID is configured by an admin through Admin → Settings
 * (key: `ads.landing_page_ad_slot`). If no slot is configured the component
 * renders nothing, so it is safe to ship before AdSense approval is complete.
 */
export function LandingAdSection() {
  const adSlot = useFeatureFlag<string>("ads.landing_page_ad_slot", "");

  if (!adSlot.trim()) return null;

  return (
    <section
      className="container mx-auto px-4 md:px-6 py-10"
      aria-label="Sponsored resource"
    >
      <div className="max-w-3xl mx-auto">
        <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-3">
          Sponsored
        </p>
        <div className="min-h-[250px] rounded-2xl border border-border/60 bg-muted/20 p-2 flex items-center justify-center">
          <GoogleAdSlot
            adSlot={adSlot.trim()}
            slotId="landing-footer"
            format="auto"
            fullWidthResponsive
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
