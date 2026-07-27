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

export function buildDeepLink(
  kind: Extract<ShareKind, "profile" | "report" | "multiplayer" | "invite">,
  id: string,
): string {
  const origin = APP_ORIGIN();
  switch (kind) {
    case "profile":
      return `${origin}/p/${encodeURIComponent(id)}`;
    case "report":
      return `${origin}/r/${encodeURIComponent(id)}`;
    case "multiplayer":
      return `${origin}/join/${encodeURIComponent(id)}`;
    case "invite":
      return `${origin}/i/${encodeURIComponent(id)}`;
  }
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
  extra?: Record<string, unknown> & { room_code?: string; ref?: string },
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
      extra: extra ?? {},
    };
    supabase.functions.invoke("track-event", { body: payload }).catch(() => {});
  } catch {}
}

/** Fire a multiplayer join conversion, attributed to the last share ref. */
export function trackJoinConversion(roomCode: string, ref: string | null) {
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
        },
      })
      .catch(() => {});
  } catch {}
}
