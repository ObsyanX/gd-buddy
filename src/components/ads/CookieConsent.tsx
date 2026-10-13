import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getConsent, setConsent, type ConsentState } from "@/lib/adsense";

/**
 * Google AdSense requires publishers to obtain consent for personalised
 * advertising in EEA/UK. This banner is always visible until a choice is
 * made, and stores the decision in localStorage via the adsense module.
 */
export function CookieConsent() {
  const [consent, setLocalConsent] = useState<ConsentState | null>(null);

  useEffect(() => {
    setLocalConsent(getConsent());
  }, []);

  if (consent === "granted" || consent === "denied") return null;

  const choose = (state: ConsentState) => {
    setConsent(state);
    setLocalConsent(state);
  };

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Cookie consent"
      className="relative z-10 shrink-0 max-h-[30dvh] overflow-y-auto border-y border-border bg-card p-3 sm:p-4"
    >
      <div className="mx-auto max-w-6xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            We use cookies to keep GD Buddy secure and to serve relevant ads
            through Google AdSense.
          </p>
          <p className="text-muted-foreground">
            Accepting helps us support free practice tools. You can read more in
            our{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms of Service
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="min-h-11" onClick={() => choose("denied")}>
            Decline
          </Button>
          <Button size="sm" className="min-h-11" onClick={() => choose("granted")}>
            Allow cookies
          </Button>
        </div>
      </div>
    </div>
  );
}
