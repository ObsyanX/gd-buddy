import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { captureAttributionFromUrl } from "@/lib/attribution";

/**
 * Public deep-link redirectors + Open Graph / Twitter Card metadata for
 * shareable URLs. Each variant renders a fully-tagged <head> so social
 * previews look great on WhatsApp, iMessage, Slack, X, LinkedIn, and
 * Facebook — then redirects into the real app screen.
 *
 * Note: for JS-executing crawlers (Googlebot, LinkedIn's re-scrape) these
 * tags are honored; classic crawlers still see index.html's sitewide OG
 * tags as a graceful fallback.
 */

const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://gdbuddy.lovable.app";

interface OGProps {
  title: string;
  description: string;
  url: string;
  image?: string;
}

function OGHead({ title, description, url, image }: OGProps) {
  const img = image ?? `${ORIGIN}/placeholder.svg`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:site_name" content="GD Buddy" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}

/** Attribution capture: runs once whenever a deep-link screen renders. */
function useCaptureRef() {
  useEffect(() => {
    captureAttributionFromUrl();
  }, []);
}

import { ogImageUrl } from "@/lib/share";

/** Forward `?s=` (HMAC signature) alongside `ref` so conversions stay verified. */
function sigParam(sp: URLSearchParams): string {
  const s = sp.get("s");
  return s ? `&s=${encodeURIComponent(s)}` : "";
}

export function ProfileDeepLink() {
  const { userId } = useParams();
  const [sp] = useSearchParams();
  useCaptureRef();
  const url = `${ORIGIN}/p/${encodeURIComponent(userId ?? "")}`;
  return (
    <>
      <OGHead
        title="Meet me on GD Buddy — group discussion practice"
        description="Join me on GD Buddy to sharpen your group-discussion skills with AI-powered practice, live rooms, and instant feedback."
        url={url}
        image={ogImageUrl({ kind: "profile", title: "Meet me on GD Buddy", subtitle: "AI-scored group discussion practice" })}
      />
      <Navigate to={`/?ref=${encodeURIComponent(userId ?? "")}&k=profile${sigParam(sp)}`} replace />
    </>
  );
}

export function ReportDeepLink() {
  const { sessionId } = useParams();
  const [sp] = useSearchParams();
  useCaptureRef();
  if (!sessionId) return <Navigate to="/home" replace />;
  const url = `${ORIGIN}/r/${encodeURIComponent(sessionId)}`;
  return (
    <>
      <OGHead
        title="My GD Buddy session report"
        description="A detailed AI-scored breakdown of my latest group-discussion practice on GD Buddy — clarity, structure, teamwork and more."
        url={url}
        image={ogImageUrl({ kind: "report", title: "My GD Buddy session report", subtitle: "AI-scored breakdown" })}
      />
      <Navigate
        to={`/home/session/${encodeURIComponent(sessionId)}/report?ref=${encodeURIComponent(sessionId)}&k=report${sigParam(sp)}`}
        replace
      />
    </>
  );
}

export function MultiplayerJoinDeepLink() {
  const { code } = useParams();
  const [sp] = useSearchParams();
  useCaptureRef();
  const url = `${ORIGIN}/join/${encodeURIComponent(code ?? "")}`;
  const search = code
    ? `?code=${encodeURIComponent(code)}&ref=${encodeURIComponent(code)}&k=multiplayer${sigParam(sp)}`
    : "";
  return (
    <>
      <OGHead
        title={`Join my GD Buddy room${code ? ` · ${code}` : ""}`}
        description="Jump into a live group discussion with me on GD Buddy — scan or tap to join instantly with your invite code."
        url={url}
        image={ogImageUrl({ kind: "multiplayer", title: "Join my live GD room", code: code ?? undefined })}
      />
      <Navigate to={`/home/multiplayer${search}`} replace />
    </>
  );
}

export function InviteDeepLink() {
  const { ref } = useParams();
  const [sp] = useSearchParams();
  useCaptureRef();
  const target = sp.get("to") ?? "/";
  const sep = target.includes("?") ? "&" : "?";
  const url = `${ORIGIN}/i/${encodeURIComponent(ref ?? "")}`;
  return (
    <>
      <OGHead
        title="You're invited to GD Buddy"
        description="Practice group discussions with AI moderators, live rooms, and detailed feedback. Free to join."
        url={url}
        image={ogImageUrl({ kind: "invite", title: "You're invited to GD Buddy" })}
      />
      <Navigate to={`${target}${sep}ref=${encodeURIComponent(ref ?? "")}&k=invite${sigParam(sp)}`} replace />
    </>
  );
}
