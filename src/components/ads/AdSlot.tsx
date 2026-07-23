import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
  "landing.popup",
  "landing.sticky_footer",
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
  media_type?: "image" | "video" | "html" | null;
  video_url?: string | null;
  video_poster?: string | null;
  html_body?: string | null;
  refresh_ms?: number | null;
}

type Variant = "inline" | "popup" | "sticky-footer";

interface Props {
  placement: AdPlacement;
  className?: string;
  compact?: boolean;
  variant?: Variant;
  dismissible?: boolean;
}

const CAP_KEY = "gdb_ad_freq";
const DISMISS_KEY = "gdb_ad_dismissed";
const MIN_REFRESH_MS = 30000;

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
function isDismissed(placement: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw) as Record<string, number>;
    const until = obj[placement];
    return typeof until === "number" && until > Date.now();
  } catch { return false; }
}
function dismiss(placement: string, hours = 24) {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[placement] = Date.now() + hours * 3600_000;
    localStorage.setItem(DISMISS_KEY, JSON.stringify(obj));
  } catch { /* noop */ }
}

export function AdSlot({ placement, className, compact, variant = "inline", dismissible = false }: Props) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [visible, setVisible] = useState(false);
  const [dark, setDark] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => isDismissed(placement));
  const impressionFired = useRef(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark") || window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setVisible(true); });
    }, { rootMargin: "200px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const fetchAd = useCallback(() => {
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
        if (count > 10) return;
      }
      impressionFired.current = false;
      setAd(returned);
    }).catch(() => setAd(null));
  }, [placement]);

  useEffect(() => { if (visible && !dismissed) fetchAd(); }, [visible, dismissed, fetchAd]);

  // Auto-refresh (respect min 30s; pause when tab hidden)
  useEffect(() => {
    if (!ad?.refresh_ms) return;
    const interval = Math.max(MIN_REFRESH_MS, ad.refresh_ms);
    const tick = () => { if (!document.hidden) fetchAd(); };
    refreshTimer.current = setInterval(tick, interval);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [ad?.refresh_ms, fetchAd]);

  // Impression tracking (debounced 1s in viewport, 50% threshold)
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
              body: { action: "impression", ad_id: ad.id, placement, visitor_id: getVisitorId() },
            }).catch(() => {});
          }, ad.media_type === "video" ? 2000 : 1000);
        } else if (timer) { clearTimeout(timer); timer = null; }
      });
    }, { threshold: 0.5 });
    io.observe(ref.current);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [ad, placement]);

  if (dismissed) return null;
  if (!ad) return <div ref={ref} className={cn("min-h-[1px]", className)} aria-hidden />;

  const src = (dark && ad.image_url_dark) ? ad.image_url_dark : ad.image_url;
  const clickUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-click?id=${ad.id}&placement=${encodeURIComponent(placement)}&v=${encodeURIComponent(getVisitorId())}`;

  const media = ad.media_type === "video" && ad.video_url ? (
    <video
      src={ad.video_url}
      poster={ad.video_poster ?? undefined}
      autoPlay muted loop playsInline
      className={cn("w-full object-cover", compact ? "h-24" : "h-40 md:h-48")}
    />
  ) : ad.media_type === "html" && ad.html_body ? (
    <div className="w-full p-3" dangerouslySetInnerHTML={{ __html: ad.html_body }} />
  ) : src ? (
    <img
      src={src}
      alt={ad.title}
      loading="lazy"
      decoding="async"
      className={cn("w-full object-cover transition-transform group-hover:scale-[1.02]", compact ? "h-24" : "h-40 md:h-48")}
    />
  ) : null;

  const wrapperClasses =
    variant === "popup"
      ? "fixed bottom-6 right-6 z-50 w-[320px] shadow-2xl"
      : variant === "sticky-footer"
      ? "fixed bottom-0 inset-x-0 z-40 mx-auto max-w-3xl m-2 shadow-xl"
      : "";

  const handleDismiss = () => { dismiss(placement); setDismissed(true); };

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-lg border border-border/60 bg-card/95 backdrop-blur overflow-hidden",
        wrapperClasses,
        className,
      )}
    >
      {(dismissible || variant !== "inline") && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss ad"
          className="absolute top-1 right-1 z-10 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <a
        href={clickUrl}
        target="_blank"
        rel="noopener sponsored"
        className="block group"
        aria-label={`Sponsored: ${ad.title}`}
      >
        {media}
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
