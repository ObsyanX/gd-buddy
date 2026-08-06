import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { buildSupportUrls } from "@/lib/monetization";

/**
 * Reader-support (tipping) block. Keeps GD Buddy free by letting users chip in
 * via Ko-fi / Buy Me a Coffee / Patreon / UPI. Every handle is admin-configurable
 * (`support.*` flags); the section hides itself when nothing is configured.
 */
export function SupportSection() {
  const kofi = useFeatureFlag<string>("support.kofi_handle", "");
  const bmc = useFeatureFlag<string>("support.buymeacoffee_handle", "");
  const patreon = useFeatureFlag<string>("support.patreon_handle", "");
  const upi = useFeatureFlag<string>("support.upi_id", "");

  const links = buildSupportUrls({
    kofi: kofi?.trim(),
    buymeacoffee: bmc?.trim(),
    patreon: patreon?.trim(),
    upi: upi?.trim(),
  });

  if (links.length === 0) return null;

  return (
    <section className="container mx-auto px-4 md:px-6 py-12" aria-labelledby="support-heading">
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
      </div>
    </section>
  );
}
