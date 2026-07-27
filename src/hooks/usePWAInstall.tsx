import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";
import { getVisitorId } from "@/lib/analytics/visitor-id";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * PWA install helper.
 * - Captures the `beforeinstallprompt` event so we can trigger it on demand.
 * - Detects if the app is already running standalone.
 * - Exposes an iOS flag (Safari has no install event; users must use Share → Add to Home Screen).
 * - On `appinstalled`, reports an attributed install conversion to the
 *   share_events table via the track-event edge function.
 */
export function usePWAInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true
    );
  });

  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !/crios|fxios/i.test(navigator.userAgent);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      // fire-and-forget attribution
      try {
        const a = getAttribution();
        supabase.functions
          .invoke("track-event", {
            body: {
              type: "share_conversion",
              event_type: "install",
              kind: a?.kind ?? "generic",
              ref: a?.ref ?? null,
              visitor_id: getVisitorId(),
              path: typeof window !== "undefined" ? window.location.pathname : null,
            },
          })
          .catch(() => {});
      } catch {}
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome === "accepted";
  }, [deferred]);

  return {
    canInstall: !!deferred && !installed,
    installed,
    isIOS,
    install,
  };
}
