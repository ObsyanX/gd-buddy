// Track 3 — Compact 0–100 discussion health ring bound to realtime updates.

import { useDiscussionHealth } from "@/lib/behaviour/behaviour-client";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface Props {
  sessionId: string | null;
  compact?: boolean;
}

function toneFor(score: number): string {
  if (score >= 75) return "bg-emerald-500/15 text-emerald-500 border-emerald-500/40";
  if (score >= 50) return "bg-amber-500/15 text-amber-500 border-amber-500/40";
  return "bg-destructive/15 text-destructive border-destructive/40";
}

export default function DiscussionHealthMeter({ sessionId, compact }: Props) {
  const health = useDiscussionHealth(sessionId);
  if (!sessionId || !health) return null;

  const score = Math.max(0, Math.min(100, health.overall_health ?? 0));
  const tone = toneFor(score);

  return (
    <Badge
      variant="outline"
      className={`border ${tone} ${compact ? "text-[10px] px-1.5" : "text-xs"} font-mono`}
      title={`Health ${score}/100 · fairness ${(1 - health.participation_gini).toFixed(2)} · sentiment ${health.sentiment_index.toFixed(2)}`}
    >
      <Activity className={compact ? "w-2.5 h-2.5 mr-0.5" : "w-3 h-3 mr-1"} />
      Health {score}
    </Badge>
  );
}
