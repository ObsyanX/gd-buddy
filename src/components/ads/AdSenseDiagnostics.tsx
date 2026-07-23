import { useEffect, useState } from "react";
import {
  type AdEvent,
  type ConsentState,
  getAdEventHistory,
  getConsent,
  installAdSenseConsoleTap,
  setConsent,
  subscribeAdEvents,
} from "@/lib/adsense";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

function fmtTime(at: number) {
  return new Date(at).toLocaleTimeString([], { hour12: false });
}

function eventBadge(type: AdEvent["type"]) {
  switch (type) {
    case "script-load":
    case "slot-fill":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />;
    case "script-error":
    case "console-error":
      return <XCircle className="h-4 w-4 text-red-500" aria-hidden />;
    case "slot-unfilled":
      return <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden />;
    default:
      return <Loader2 className="h-4 w-4 text-muted-foreground" aria-hidden />;
  }
}

function eventLabel(e: AdEvent): string {
  switch (e.type) {
    case "consent": return `Consent → ${e.state}`;
    case "script-load": return "AdSense script loaded";
    case "script-error": return `Script error: ${e.message}`;
    case "slot-register": return `Slot registered (${e.slotId}, ad_slot=${e.adSlot})`;
    case "slot-push": return `Slot pushed to adsbygoogle (${e.slotId})`;
    case "slot-fill": return `Slot FILLED (${e.slotId})`;
    case "slot-unfilled": return `Slot UNFILLED — no ad returned (${e.slotId})`;
    case "console-error": return `Console error: ${e.message}`;
  }
}

/**
 * Live diagnostics panel for AdSense integration.
 * Streams events from the shared bus so any AdSlot on the page is visible.
 */
export function AdSenseDiagnostics() {
  const [events, setEvents] = useState<AdEvent[]>([]);
  const [consent, setConsentState] = useState<ConsentState>("granted");

  useEffect(() => {
    installAdSenseConsoleTap();
    setConsentState(getConsent());
    setEvents(getAdEventHistory());
    const unsub = subscribeAdEvents((e) => {
      setEvents((prev) => {
        const next = [...prev, e];
        return next.length > 200 ? next.slice(-200) : next;
      });
      if (e.type === "consent") setConsentState(e.state);
    });
    return unsub;
  }, []);

  const scriptLoaded = events.some((e) => e.type === "script-load");
  const anyFilled = events.some((e) => e.type === "slot-fill");
  const anyError = events.some((e) => e.type === "script-error" || e.type === "console-error");

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">AdSense diagnostics</h3>
        <Badge variant={scriptLoaded ? "default" : "secondary"}>
          {scriptLoaded ? "Script loaded" : "Script pending"}
        </Badge>
        <Badge variant={anyFilled ? "default" : "secondary"}>
          {anyFilled ? "Slots filled" : "No fills yet"}
        </Badge>
        {anyError && <Badge variant="destructive">Errors detected</Badge>}
        <Badge variant="outline">Consent: {consent}</Badge>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={consent === "granted" ? "default" : "outline"}
          onClick={() => setConsent("granted")}
        >
          Grant consent
        </Button>
        <Button
          size="sm"
          variant={consent === "denied" ? "destructive" : "outline"}
          onClick={() => setConsent("denied")}
        >
          Deny consent
        </Button>
      </div>

      <div className="max-h-72 overflow-auto rounded border border-border/60 bg-muted/30">
        {events.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            No events yet. Grant consent and mount an ad slot to see activity.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {events.map((e, i) => (
              <li key={i} className="flex items-start gap-2 px-3 py-2 text-sm">
                <span className="mt-0.5">{eventBadge(e.type)}</span>
                <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                  {fmtTime(e.at)}
                </span>
                <span className="flex-1 break-words">{eventLabel(e)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
