import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/analytics/visitor-id";

/** Fires page_view on every route change (idempotent, sendBeacon-preferred). */
export function useTracker() {
  const loc = useLocation();
  const { user } = useAuth();
  const lastPath = useRef<string>("");

  useEffect(() => {
    const path = loc.pathname + loc.search;
    if (path === lastPath.current) return;
    lastPath.current = path;

    const payload = {
      type: "page_view",
      visitor_id: getVisitorId(),
      user_id: user?.id ?? null,
      path,
      referrer: document.referrer || null,
    };

    // Use edge function via supabase client so URL & anon key are handled.
    supabase.functions.invoke("track-event", { body: payload }).catch(() => {
      /* swallow — tracking never breaks UX */
    });
  }, [loc.pathname, loc.search, user?.id]);
}

/** Manually report a login attempt. */
export async function trackLogin(success: boolean, email?: string, reason?: string, userId?: string | null) {
  try {
    await supabase.functions.invoke("track-event", {
      body: {
        type: success ? "login_success" : "login_failed",
        visitor_id: getVisitorId(),
        user_id: userId ?? null,
        email,
        reason,
      },
    });
  } catch { /* noop */ }
}
