// Real User Monitoring — captures Core Web Vitals with AdSense load state
// and posts them to Supabase for admin dashboards.
import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from "web-vitals";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/analytics/visitor-id";

function detectDevice(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent || "";
  if (/iPad|tablet|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function isAdsenseLoaded(): boolean {
  // AdSense injects window.adsbygoogle (array-like) as soon as its script executes.
  const w = window as unknown as { adsbygoogle?: unknown[] };
  return Array.isArray(w.adsbygoogle) && (w.adsbygoogle as unknown[]).length >= 0
    ? !!document.querySelector('script[src*="adsbygoogle"]')
    : false;
}

let started = false;
export function startRUM() {
  if (started || typeof window === "undefined") return;
  started = true;

  const device = detectDevice();
  const visitor_id = getVisitorId();
  const path = location.pathname;
  const ua = navigator.userAgent;

  const send = (m: Metric) => {
    const row = {
      visitor_id,
      path,
      metric: m.name,
      value: m.value,
      rating: m.rating,
      device,
      adsense_loaded: isAdsenseLoaded(),
      navigation_type: m.navigationType,
      user_agent: ua,
    };
    // fire-and-forget; use sendBeacon on unload metrics when possible.
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/web_vitals_events`;
      const blob = new Blob([JSON.stringify(row)], { type: "application/json" });
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (navigator.sendBeacon && anon) {
        // sendBeacon can't set custom headers; fall back to fetch keepalive.
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anon,
            Authorization: `Bearer ${anon}`,
            Prefer: "return=minimal",
          },
          body: blob,
          keepalive: true,
        }).catch(() => void 0);
      } else {
        void supabase.from("web_vitals_events").insert(row as never);
      }
    } catch {
      /* never break UX */
    }
  };

  onLCP(send);
  onINP(send);
  onCLS(send);
  onFCP(send);
  onTTFB(send);
}
