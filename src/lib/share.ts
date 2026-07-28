// Cross-platform share helpers + analytics + per-target message templating.

import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/analytics/visitor-id";

export type ShareTarget =
  | "whatsapp"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "telegram"
  | "email"
  | "sms"
  | "copy"
  | "native"
  | "qr";

export type ShareKind = "profile" | "report" | "invite" | "multiplayer" | "generic";

export interface ShareContent {
  title: string;
  text: string;
  url: string;
  /** Optional structured hints used to render richer per-target copy. */
  meta?: {
    kind?: ShareKind;
    topic?: string;
    score?: number | string;
    highlights?: string[];
    roomCode?: string;
    hashtags?: string[]; // for twitter
  };
}

// ---------- Deep-link builder (canonical shareable URLs) ----------

const APP_ORIGIN = () =>
  typeof window !== "undefined" ? window.location.origin : "https://gdbuddy.lovable.app";

type DeepLinkKind = Extract<ShareKind, "profile" | "report" | "multiplayer" | "invite">;

function deepLinkPath(kind: DeepLinkKind, id: string): string {
  const enc = encodeURIComponent(id);
  switch (kind) {
    case "profile": return `/p/${enc}`;
    case "report": return `/r/${enc}`;
    case "multiplayer": return `/join/${enc}`;
    case "invite": return `/i/${enc}`;
  }
}

export function buildDeepLink(kind: DeepLinkKind, id: string): string {
  return `${APP_ORIGIN()}${deepLinkPath(kind, id)}`;
}

/**
 * Build a signed deep link. The `s=` query param binds (kind, ref) via HMAC
 * so downstream install/join conversions cannot be spoofed by editing `ref`.
 * Falls back to an unsigned link when the caller is unauthenticated or the
 * edge function is unreachable (analytics still record verified=false).
 */
export async function buildSignedDeepLink(
  kind: DeepLinkKind,
  id: string,
): Promise<string> {
  const base = buildDeepLink(kind, id);
  try {
    const { data, error } = await supabase.functions.invoke("sign-share-ref", {
      body: { kind, ref: id },
    });
    if (error || !data?.sig) return base;
    return `${base}?s=${encodeURIComponent(data.sig)}`;
  } catch {
    return base;
  }
}

/** OG image URL for a share — hits the og-image edge function. */
export function ogImageUrl(params: {
  kind: ShareKind;
  title: string;
  subtitle?: string;
  score?: string | number;
  code?: string;
}): string {
  const projectId = (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_PROJECT_ID;
  const base = projectId
    ? `https://${projectId}.supabase.co/functions/v1/og-image`
    : `${APP_ORIGIN()}/functions/v1/og-image`;
  const qs = new URLSearchParams({ kind: params.kind, title: params.title });
  if (params.subtitle) qs.set("subtitle", params.subtitle);
  if (params.score != null) qs.set("score", String(params.score));
  if (params.code) qs.set("code", params.code);
  return `${base}?${qs.toString()}`;
}

// ---------- Per-target message shaping ----------

function highlightBlock(hs?: string[]): string {
  if (!hs || hs.length === 0) return "";
  return "\n\n" + hs.slice(0, 3).map((h) => `• ${h}`).join("\n");
}

/**
 * Produce a target-optimized (title, text, url) triple. Twitter gets a
 * short line + hashtags, WhatsApp/Telegram get emoji + highlights, LinkedIn
 * a polished pitch, email a full body.
 */
export function renderForTarget(target: ShareTarget, c: ShareContent): ShareContent {
  const kind = c.meta?.kind ?? "generic";
  const topic = c.meta?.topic;
  const score = c.meta?.score;
  const highlights = c.meta?.highlights;

  const base: ShareContent = { ...c };

  if (target === "twitter") {
    const tags = (c.meta?.hashtags ?? ["GDBuddy", "GroupDiscussion"])
      .map((t) => `#${t.replace(/^#/, "")}`)
      .join(" ");
    let text = c.text;
    if (kind === "report" && topic) {
      text = `Just wrapped a group discussion on “${topic}”${score ? ` — scored ${score}/100` : ""} on @GDBuddy 🎯`;
    } else if (kind === "multiplayer" && c.meta?.roomCode) {
      text = `Jump into my live GD room (code ${c.meta.roomCode}) on GD Buddy 🎙️`;
    }
    // Twitter ~280 chars incl. URL (t.co ~23).
    text = text.slice(0, 200);
    base.text = `${text} ${tags}`.trim();
    return base;
  }

  if (target === "whatsapp" || target === "telegram" || target === "sms") {
    let text = c.text;
    if (kind === "report" && topic) {
      text = `🎯 Just finished a GD on “${topic}”${score ? ` — scored ${score}/100` : ""} on GD Buddy.`;
    } else if (kind === "multiplayer" && c.meta?.roomCode) {
      text = `🎙️ Join my group discussion room on GD Buddy — code *${c.meta.roomCode}* — topic: ${topic ?? "surprise!"}`;
    } else if (kind === "invite") {
      text = `👋 I'm practicing group discussions on GD Buddy — join me and let's level up together!`;
    } else if (kind === "profile") {
      text = `👀 Check out my GD Buddy profile.`;
    }
    base.text = text + highlightBlock(highlights);
    return base;
  }

  if (target === "linkedin") {
    if (kind === "report" && topic) {
      base.text = `Sharpening my group-discussion skills on GD Buddy — latest session on “${topic}”${score ? ` scored ${score}/100` : ""}.${highlightBlock(highlights)}`;
    } else if (kind === "profile") {
      base.text = `Building interview + group-discussion skills on GD Buddy.`;
    }
    return base;
  }

  if (target === "email") {
    const subject =
      kind === "report" && topic
        ? `My GD Buddy report — ${topic}`
        : kind === "multiplayer"
          ? `Join my GD Buddy room${c.meta?.roomCode ? ` (${c.meta.roomCode})` : ""}`
          : c.title;
    base.title = subject;
    base.text = `${c.text}${highlightBlock(highlights)}\n\nOpen: ${c.url}`;
    return base;
  }

  return base;
}

export function previewForTarget(target: ShareTarget, c: ShareContent): string {
  const r = renderForTarget(target, c);
  return `${r.text}\n${r.url}`.trim();
}

// ---------- URL builders (unchanged semantics) ----------

export function buildTargetUrl(target: ShareTarget, raw: ShareContent): string {
  const c = renderForTarget(target, raw);
  const url = encodeURIComponent(c.url);
  const text = encodeURIComponent(c.text);
  const title = encodeURIComponent(c.title);
  const combined = encodeURIComponent(`${c.text}\n${c.url}`);
  switch (target) {
    case "whatsapp":
      return `https://wa.me/?text=${combined}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case "telegram":
      return `https://t.me/share/url?url=${url}&text=${text}`;
    case "email":
      return `mailto:?subject=${title}&body=${combined}`;
    case "sms":
      return `sms:?&body=${combined}`;
    case "copy":
    case "qr":
    case "native":
      return c.url;
  }
}

export async function tryNativeShare(raw: ShareContent): Promise<boolean> {
  if (typeof navigator === "undefined" || !("share" in navigator)) return false;
  const c = renderForTarget("native", raw);
  try {
    await (navigator as Navigator & { share: (d: ShareContent) => Promise<void> }).share({
      title: c.title,
      text: c.text,
      url: c.url,
    });
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ---------- Analytics ----------

/** Fire-and-forget share analytics. Never throws. */
export function trackShare(
  target: ShareTarget,
  kind: ShareKind,
  extra?: Record<string, unknown> & { room_code?: string; ref?: string; sig?: string },
) {
  try {
    const payload = {
      type: "share",
      visitor_id: getVisitorId(),
      path: typeof window !== "undefined" ? window.location.pathname : null,
      target,
      kind,
      room_code: extra?.room_code ?? null,
      ref: extra?.ref ?? null,
      sig: extra?.sig ?? null,
      extra: extra ?? {},
    };
    supabase.functions.invoke("track-event", { body: payload }).catch(() => {});
  } catch {}
}

/** Fire a multiplayer join conversion, attributed to the last share ref. */
export function trackJoinConversion(roomCode: string, ref: string | null, sig?: string | null) {
  try {
    supabase.functions
      .invoke("track-event", {
        body: {
          type: "share_conversion",
          event_type: "join",
          kind: "multiplayer",
          visitor_id: getVisitorId(),
          path: typeof window !== "undefined" ? window.location.pathname : null,
          room_code: roomCode,
          ref,
          sig: sig ?? null,
        },
      })
      .catch(() => {});
  } catch {}
}
