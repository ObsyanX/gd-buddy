import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Heart, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { buildSupportUrls } from "@/lib/monetization";
import { toast } from "@/hooks/use-toast";

/**
 * Reader-support (tipping) block. Keeps GD Buddy free by letting users chip in
 * via Ko-fi / Buy Me a Coffee / Patreon / UPI. Every handle is admin-configurable
 * (`support.*` flags); the section hides itself when nothing is configured.
 */
export function SupportSection({ compact = false }: { compact?: boolean }) {
  const kofi = useFeatureFlag<string>("support.kofi_handle", "");
  const bmc = useFeatureFlag<string>("support.buymeacoffee_handle", "");
  const patreon = useFeatureFlag<string>("support.patreon_handle", "");
  const upi = useFeatureFlag<string>("support.upi_id", "duttasayan947595-2@oksbi");
  const qrUpload = useFeatureFlag<string>("support.upi_qr_url", "");
  const [copied, setCopied] = useState(false);

  const upiId = upi?.trim();
  const links = buildSupportUrls({
    kofi: kofi?.trim(),
    buymeacoffee: bmc?.trim(),
    patreon: patreon?.trim(),
    upi: upiId,
  });

  if (links.length === 0) return null;

  const upiUrl = links.find((l) => l.id === "upi")?.url;
  const customQr = qrUpload?.trim();

  const copyUpi = async () => {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "UPI ID copied", description: upiId });
    } catch {
      toast({ title: "Copy failed", description: upiId, variant: "destructive" });
    }
  };

  return (
    <section
      className={compact ? "px-1 pb-8" : "container mx-auto px-4 md:px-6 py-12"}
      aria-labelledby="support-heading"
    >
      <div className="max-w-3xl mx-auto rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8 text-center">
        <Heart className="mx-auto h-6 w-6 text-primary" aria-hidden />
        <h2 id="support-heading" className="mt-3 text-xl md:text-2xl font-semibold tracking-tight">
          Keep GD Buddy free for everyone
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
          Every practice session, AI persona and feedback report stays free. If GD Buddy helped you
          prepare, a small contribution covers the AI and hosting costs for another student.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {links.map((l) => (
            <Button key={l.id} asChild variant={l.id === "kofi" ? "default" : "secondary"} size="sm">
              <a href={l.url} target="_blank" rel="noopener noreferrer nofollow">
                Support via {l.label}
              </a>
            </Button>
          ))}
        </div>

        {(customQr || (upiId && upiUrl)) && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-5">
            <div className="rounded-xl bg-background p-3 border border-border/60">
              {customQr ? (
                <img
                  src={customQr}
                  alt="GD Buddy payment QR code for UPI contributions"
                  width={132}
                  height={132}
                  loading="lazy"
                  className="h-[132px] w-[132px] object-contain"
                />
              ) : (
                <QRCodeSVG value={upiUrl!} size={132} includeMargin={false} role="img" aria-label="GD Buddy payment QR code for UPI contributions" />
              )}
            </div>
            <div className="text-left">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Scan to pay via UPI</p>
              {upiId && <p className="mt-1 font-mono text-sm break-all">{upiId}</p>}
              {upiId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 min-h-11"
                  onClick={copyUpi}
                  aria-label={copied ? "UPI ID copied" : "Copy GD Buddy UPI ID to clipboard"}
                >
                  {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                  {copied ? "Copied" : "Copy UPI ID"}
                </Button>
              )}
              <span className="sr-only" aria-live="polite">{copied ? "UPI ID copied to clipboard" : ""}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
