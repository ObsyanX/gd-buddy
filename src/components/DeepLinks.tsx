import { Navigate, useParams, useSearchParams } from "react-router-dom";

/**
 * Public deep-link redirectors. Keep the shareable URLs short and stable
 * (`/p/:id`, `/r/:id`, `/join/:code`, `/i/:ref`) while routing users to the
 * real in-app screen. Works on mobile + desktop, before or after auth —
 * auth-gated destinations preserve the intended path via ProtectedRoute.
 */

export function ProfileDeepLink() {
  const { userId } = useParams();
  return <Navigate to={`/?ref=${encodeURIComponent(userId ?? "")}`} replace />;
}

export function ReportDeepLink() {
  const { sessionId } = useParams();
  if (!sessionId) return <Navigate to="/home" replace />;
  return <Navigate to={`/home/session/${encodeURIComponent(sessionId)}/report`} replace />;
}

export function MultiplayerJoinDeepLink() {
  const { code } = useParams();
  const search = code ? `?code=${encodeURIComponent(code)}` : "";
  return <Navigate to={`/home/multiplayer${search}`} replace />;
}

export function InviteDeepLink() {
  const { ref } = useParams();
  const [sp] = useSearchParams();
  const target = sp.get("to") ?? "/";
  const sep = target.includes("?") ? "&" : "?";
  return <Navigate to={`${target}${sep}ref=${encodeURIComponent(ref ?? "")}`} replace />;
}
