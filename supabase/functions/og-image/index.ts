// Dynamic Open Graph image renderer. Returns a 1200×630 PNG (SVG-based)
// tailored to profile / report / invite / multiplayer shares so previews
// look consistent across WhatsApp, iMessage, X, LinkedIn, Facebook.
//
// This uses hand-authored SVG (no heavy satori/wasm dependency) and lets
// the platform CDN cache aggressively via Cache-Control.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type Kind = "profile" | "report" | "invite" | "multiplayer" | "generic";

const KIND_META: Record<Kind, { badge: string; accent: string; tagline: string }> = {
  profile:     { badge: "PROFILE",      accent: "#f59e0b", tagline: "Group discussion practice, live." },
  report:      { badge: "SESSION REPORT", accent: "#22c55e", tagline: "AI-scored discussion breakdown." },
  invite:      { badge: "YOU'RE INVITED", accent: "#3b82f6", tagline: "Practice GDs together on GD Buddy." },
  multiplayer: { badge: "LIVE ROOM",    accent: "#a855f7", tagline: "Jump into a live group discussion." },
  generic:     { badge: "GD BUDDY",     accent: "#f59e0b", tagline: "Group discussion practice, powered by AI." },
};

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[c] as string));
}

function wrap(text: string, max: number, lines: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      out.push(line.trim());
      line = w;
      if (out.length === lines) break;
    } else line = (line + " " + w).trim();
  }
  if (out.length < lines && line) out.push(line.trim());
  if (out.length === lines && words.join(" ").length > out.join(" ").length) {
    out[lines - 1] = out[lines - 1].replace(/.{3}$/, "…");
  }
  return out;
}

function renderSVG(params: {
  kind: Kind;
  title: string;
  subtitle?: string;
  score?: string;
  roomCode?: string;
}): string {
  const meta = KIND_META[params.kind] ?? KIND_META.generic;
  const titleLines = wrap(params.title, 26, 3);
  const subtitle = params.subtitle ? esc(params.subtitle) : meta.tagline;
  const rightBadge = params.roomCode
    ? `<g>
         <rect x="820" y="240" width="320" height="180" rx="24" fill="rgba(255,255,255,0.06)" stroke="${meta.accent}" stroke-width="2"/>
         <text x="980" y="300" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="Inter,system-ui,sans-serif" font-size="20" font-weight="600" letter-spacing="4">ROOM CODE</text>
         <text x="980" y="380" text-anchor="middle" fill="#fff" font-family="'JetBrains Mono',monospace" font-size="72" font-weight="800">${esc(params.roomCode)}</text>
       </g>`
    : params.score
    ? `<g>
         <circle cx="980" cy="330" r="120" fill="none" stroke="${meta.accent}" stroke-width="6" opacity="0.5"/>
         <text x="980" y="320" text-anchor="middle" fill="#fff" font-family="Inter,system-ui,sans-serif" font-size="88" font-weight="800">${esc(params.score)}</text>
         <text x="980" y="370" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="Inter,system-ui,sans-serif" font-size="22" font-weight="600" letter-spacing="4">/100</text>
       </g>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b0f1a"/>
      <stop offset="1" stop-color="#151a2c"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.6">
      <stop offset="0" stop-color="${meta.accent}" stop-opacity="0.25"/>
      <stop offset="1" stop-color="${meta.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="8" height="630" fill="${meta.accent}"/>

  <g transform="translate(80,90)">
    <rect width="180" height="42" rx="21" fill="${meta.accent}"/>
    <text x="90" y="29" text-anchor="middle" fill="#0b0f1a" font-family="Inter,system-ui,sans-serif" font-size="18" font-weight="800" letter-spacing="2">${esc(meta.badge)}</text>
  </g>

  <g transform="translate(80,200)">
    ${titleLines.map((l, i) => `<text x="0" y="${i * 76}" fill="#fff" font-family="Inter,system-ui,sans-serif" font-size="64" font-weight="800">${esc(l)}</text>`).join("")}
  </g>

  <text x="80" y="${200 + titleLines.length * 76 + 46}" fill="rgba(255,255,255,0.7)" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="500">${subtitle}</text>

  ${rightBadge}

  <g transform="translate(80,540)">
    <circle cx="24" cy="24" r="24" fill="${meta.accent}"/>
    <text x="24" y="32" text-anchor="middle" fill="#0b0f1a" font-family="Inter,system-ui,sans-serif" font-size="26" font-weight="800">G</text>
    <text x="66" y="34" fill="#fff" font-family="Inter,system-ui,sans-serif" font-size="26" font-weight="700">GD Buddy</text>
    <text x="66" y="60" fill="rgba(255,255,255,0.55)" font-family="Inter,system-ui,sans-serif" font-size="18" font-weight="500">gdbuddy.lovable.app</text>
  </g>
</svg>`;
}

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") as Kind) || "generic";
  const title = (url.searchParams.get("title") || "GD Buddy — Group discussion practice").slice(0, 160);
  const subtitle = url.searchParams.get("subtitle")?.slice(0, 160) ?? undefined;
  const score = url.searchParams.get("score")?.slice(0, 8) ?? undefined;
  const roomCode = url.searchParams.get("code")?.slice(0, 12) ?? undefined;

  const svg = renderSVG({ kind, title, subtitle, score, roomCode });
  // SVG is universally accepted by modern crawlers (X, LinkedIn, Slack,
  // WhatsApp Business). Cached for a day at the CDN edge.
  return new Response(svg, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
    },
  });
});
