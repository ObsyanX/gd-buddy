import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { GoogleAdSlot } from "@/components/ads/GoogleAdSlot";
import { AdSenseDiagnostics } from "@/components/ads/AdSenseDiagnostics";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LS_KEY = "adsense_test_slot_id";

/**
 * /adsense-test — public diagnostic page.
 * Renders a single GoogleAdSlot with a user-supplied slot ID plus a live
 * diagnostics panel so you can confirm ownership verification, script load,
 * and fill/unfill behaviour in production.
 */
export default function AdsenseTest() {
  const [slot, setSlot] = useState<string>("");
  const [mountedSlot, setMountedSlot] = useState<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        setSlot(saved);
        setMountedSlot(saved);
      }
    } catch { /* ignore */ }
  }, []);

  const mount = () => {
    const trimmed = slot.trim();
    if (!trimmed) return;
    try { localStorage.setItem(LS_KEY, trimmed); } catch { /* ignore */ }
    // Remount to reset diagnostics for the new slot.
    setMountedSlot("");
    setTimeout(() => setMountedSlot(trimmed), 20);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>AdSense Test | GD Buddy</title>
        <meta name="description" content="Diagnostics page for verifying Google AdSense integration on GD Buddy." />
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">AdSense integration test</h1>
          <p className="text-sm text-muted-foreground">
            Publisher: <code className="font-mono">{ADSENSE_CLIENT}</code>. Enter a real
            ad slot ID from your AdSense dashboard, then mount it below. The panel logs
            every step so you can pinpoint where a slot is failing.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <Label htmlFor="slot">Ad slot ID</Label>
          <div className="flex gap-2">
            <Input
              id="slot"
              placeholder="e.g. 1234567890"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              inputMode="numeric"
            />
            <Button onClick={mount} disabled={!slot.trim()}>
              Mount slot
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Find slot IDs in AdSense → Ads → By ad unit. Value is stored locally so this
            page remembers it across reloads.
          </p>
        </div>

        {mountedSlot ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Live ad slot</span>
              <code className="font-mono text-xs text-muted-foreground">{mountedSlot}</code>
            </div>
            <div className="min-h-[250px] rounded border border-dashed border-border/60 bg-muted/20 p-2">
              <GoogleAdSlot adSlot={mountedSlot} slotId={`test-${mountedSlot}`} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              An empty box means AdSense returned "unfilled" — normal for new accounts,
              new slots, or low ad demand. Check the diagnostics panel for the exact
              signal.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Enter a slot ID above and click <span className="font-medium">Mount slot</span> to render an ad here.
          </div>
        )}

        <AdSenseDiagnostics />
      </div>
    </div>
  );
}
