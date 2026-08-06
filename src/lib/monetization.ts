// Consent-aware loaders for non-AdSense ad networks (Media.net, Ezoic, Carbon)
// plus helpers for the reader-support (tipping) section.
//
// All loaders reuse the same consent state as AdSense (`getConsent()` in
// src/lib/adsense.ts) so a single cookie banner governs every network.

import { getConsent, subscribeAdEvents } from "@/lib/adsense";

export type AdNetwork = "adsense" | "medianet" | "ezoic" | "carbon" | "none";

const loaded = new Map<string, Promise<void>>();

function injectScript(
  key: string,
  build: () => HTMLScriptElement,
  target: HTMLElement = document.head,
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (getConsent() !== "granted") return Promise.reject(new Error("consent-denied"));
  const existing = loaded.get(key);
  if (existing) return existing;

  const p = new Promise<void>((resolve, reject) => {
    const s = build();
    s.async = true;
    s.dataset.monetizationKey = key;
    s.onload = () => resolve();
    s.onerror = () => {
      loaded.delete(key);
      reject(new Error(`${key} script failed to load`));
    };
    target.appendChild(s);
  });
  loaded.set(key, p);
  return p;
}

/** Media.net contextual ads. `cid` is the customer ID from the Media.net dashboard. */
export function loadMediaNet(cid: string): Promise<void> {
  if (!cid) return Promise.reject(new Error("medianet: missing customer id"));
  return injectScript(`medianet:${cid}`, () => {
    (window as unknown as Record<string, unknown>)._mNHandle = { queue: [] };
    const s = document.createElement("script");
    s.src = `https://contextual.media.net/dmedianet.js?cid=${encodeURIComponent(cid)}`;
    return s;
  });
}

/** Ezoic ad tester / humix. `id` is the Ezoic site id (sa.min.js is site-agnostic). */
export function loadEzoic(): Promise<void> {
  return injectScript("ezoic", () => {
    const w = window as unknown as Record<string, unknown>;
    w.ezstandalone = w.ezstandalone || { cmd: [] };
    const s = document.createElement("script");
    s.src = "https://www.ezojs.com/ezoic/sa.min.js";
    return s;
  });
}

/**
 * Carbon Ads renders a single unit per placement and must be injected directly
 * inside the container element, so it takes the target node.
 */
export function loadCarbon(serve: string, placement: string, target: HTMLElement): Promise<void> {
  if (!serve || !placement) return Promise.reject(new Error("carbon: missing serve/placement"));
  if (getConsent() !== "granted") return Promise.reject(new Error("consent-denied"));
  return new Promise<void>((resolve, reject) => {
    target.querySelector("#_carbonads_js")?.remove();
    const s = document.createElement("script");
    s.id = "_carbonads_js";
    s.async = true;
    s.src = `https://cdn.carbonads.com/carbon.js?serve=${encodeURIComponent(serve)}&placement=${encodeURIComponent(placement)}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("carbon script failed to load"));
    target.appendChild(s);
  });
}

/** Re-run a callback whenever consent flips to granted (e.g. after the banner). */
export function onConsentGranted(cb: () => void): () => void {
  if (getConsent() === "granted") cb();
  return subscribeAdEvents((e) => {
    if (e.type === "consent" && e.state === "granted") cb();
  });
}

// ---------- reader support (tipping) ----------

export interface SupportLinks {
  kofi?: string;
  buymeacoffee?: string;
  patreon?: string;
  upi?: string;
}

export function buildSupportUrls(links: SupportLinks) {
  const out: { id: string; label: string; url: string }[] = [];
  if (links.kofi) out.push({ id: "kofi", label: "Ko-fi", url: `https://ko-fi.com/${links.kofi}` });
  if (links.buymeacoffee)
    out.push({ id: "bmc", label: "Buy Me a Coffee", url: `https://buymeacoffee.com/${links.buymeacoffee}` });
  if (links.patreon) out.push({ id: "patreon", label: "Patreon", url: `https://patreon.com/${links.patreon}` });
  if (links.upi)
    out.push({
      id: "upi",
      label: "UPI",
      url: `upi://pay?pa=${encodeURIComponent(links.upi)}&pn=GD%20Buddy&cu=INR`,
    });
  return out;
}
