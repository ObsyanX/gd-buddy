import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/analytics/visitor-id";
import { detectClientEnv } from "@/lib/analytics/ua-client";
import { cn } from "@/lib/utils";

// Placements ads are ALLOWED to render on. Anything else is rejected.
export const AD_PLACEMENTS = [
  "landing.hero_bottom",
  "landing.features",
  "landing.testimonials",
  "landing.footer",
  "blog.between_cards",
  "blog.sidebar",
  "blog.top_banner",
  "article.after_first_section",
  "article.middle",
  "article.before_related",
  "dashboard.sidebar",
  "dashboard.below_stats",
  "dashboard.bottom",
  "results.after_feedback",
  "results.before_recommendations",
  "help.sidebar",
  "help.bottom",
  "docs.sidebar",
  "docs.bottom",
] as const;

export type AdPlacement = typeof AD_PLACEMENTS[number];

interface Ad {
  id: string;
  title: string;
  advertiser: string | null;
  description: string | null;
  image_url: string | null;
  image_url_dark: string | null;
  destination_url: string;
  cta_text: string | null;
  ad_type: string;
}

interface Props {
  placement: AdPlacement;
  className?: string;
  compact?: boolean;
}

const CAP_KEY = "gdb_ad_freq";
function bumpCap(adId: string): number {
  try {
    const raw = localStorage.getItem(CAP_KEY);
    const day = new Date().toISOString().slice(0, 10);
    const obj = raw ? JSON.parse(raw) : { day, counts: {} };
    if (obj.day !== day) { obj.day = day; obj.counts = {}; }
    obj.counts[adId] = (obj.counts[adId] || 0) + 1;
    localStorage.setItem(CAP_KEY, JSON.stringify(obj));
    return obj.counts[adId];
  } catch { return 1; }
}

export function AdSlot({ placement, className, compact }: Props) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [visible, setVisible] = useState(false);
  const [dark, setDark] = useState(false);
  const impressionFired = useRef(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark") || window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  // Lazy-load: only fetch when the slot enters viewport.
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setVisible(true);
      });
    }, { rootMargin: "200px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const env = detectClientEnv();
    supabase.functions.invoke("ad-serve", {
      body: {
        action: "serve",
        placement,
        device: env.device,
        browser: env.browser,
        os: env.os,
        visitor_id: getVisitorId(),
      },
    }).then((r) => {
      const returned = (r.data as { ad?: Ad } | null)?.ad ?? null;
      if (returned) {
        const count = bumpCap(returned.id);
        // frequency cap: enforce a client-side 10/day soft ceiling
        if (count > 10) return;
      }
      setAd(returned);
    }).catch(() => setAd(null));
  }, [visible, placement]);

  // Impression tracking (debounced 1s in viewport)
  useEffect(() => {
    if (!ad || !ref.current || impressionFired.current) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !impressionFired.current) {
          timer = setTimeout(() => {
            if (impressionFired.current) return;
            impressionFired.current = true;
            supabase.functions.invoke("ad-serve", {
              body: {
                action: "impression",
                ad_id: ad.id,
                placement,
                visitor_id: getVisitorId(),
              },
            }).catch(() => {});
          }, 1000);
        } else if (timer) { clearTimeout(timer); timer = null; }
      });
    }, { threshold: 0.5 });
    io.observe(ref.current);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [ad, placement]);

  if (!ad) {
    return <div ref={ref} className={cn("min-h-[1px]", className)} aria-hidden />;
  }

  const src = (dark && ad.image_url_dark) ? ad.image_url_dark : ad.image_url;
  const clickUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-click?id=${ad.id}&placement=${encodeURIComponent(placement)}&v=${encodeURIComponent(getVisitorId())}`;

  return (
    <div ref={ref} className={cn("relative rounded-lg border border-border/60 bg-card/40 overflow-hidden", className)}>
      <a
        href={clickUrl}
        target="_blank"
        rel="noopener sponsored"
        className="block group"
        aria-label={`Sponsored: ${ad.title}`}
      >
        {src && (
          <img
            src={src}
            alt={ad.title}
            loading="lazy"
            decoding="async"
            className={cn("w-full object-cover transition-transform group-hover:scale-[1.02]", compact ? "h-24" : "h-40 md:h-48")}
          />
        )}
        <div className="p-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <span>Sponsored</span>
            {ad.advertiser && <span className="truncate ml-2">{ad.advertiser}</span>}
          </div>
          <div className="font-semibold text-sm leading-tight line-clamp-2">{ad.title}</div>
          {ad.description && !compact && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>
          )}
          {ad.cta_text && (
            <div className="mt-2 inline-flex text-xs font-medium text-primary">{ad.cta_text} →</div>
          )}
        </div>
      </a>
    </div>
  );
}

export default AdSlot;
