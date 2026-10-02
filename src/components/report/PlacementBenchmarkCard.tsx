import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, TrendingUp, Users, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface PlacementBenchmarkProps {
  fluencyScore: number | null;
  contentScore: number | null;
  structureScore: number | null;
  voiceScore: number | null;
  overallScore: number | null;
  track?: string;
}

export interface ReadinessTier {
  band: string;
  percentileText: string;
  colorClass: string;
  description: string;
  probability: number;
}

export function computePlacementReadiness(score: number | null): ReadinessTier {
  const s = score ?? 0;
  if (s >= 85) {
    return {
      band: "Day-1 / Tier-1 Ready (Elite)",
      percentileText: "Top 8% of National Candidates",
      colorClass: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
      description: "Exceptional analytical depth, MECE structure, and persuasive floor presence matching top consulting & product firm bars.",
      probability: 94
    };
  } else if (s >= 72) {
    return {
      band: "Strong Placement Contender",
      percentileText: "Top 24% of National Candidates",
      colorClass: "text-blue-500 border-blue-500/30 bg-blue-500/10",
      description: "Consistent articulation, solid data-points, and clear turn-taking meeting IT Tier-1 & Core engineering company criteria.",
      probability: 78
    };
  } else if (s >= 55) {
    return {
      band: "Emerging Communicator",
      percentileText: "Top 52% of National Candidates",
      colorClass: "text-amber-500 border-amber-500/30 bg-amber-500/10",
      description: "Good initial contributions, but needs sharper framework usage (PEEL) and reduced hesitation during counter-arguments.",
      probability: 52
    };
  } else {
    return {
      band: "High Remediation Required",
      percentileText: "Bottom 35% of Candidates",
      colorClass: "text-destructive border-destructive/30 bg-destructive/10",
      description: "Insufficient speech volume, excessive filler words, or lack of structured arguments. Practice Phase 1 drills.",
      probability: 25
    };
  }
}

export const PlacementBenchmarkCard = ({
  fluencyScore,
  contentScore,
  structureScore,
  voiceScore,
  overallScore,
  track = "general"
}: PlacementBenchmarkProps) => {
  if (overallScore === null || overallScore === undefined) {
    return null;
  }

  const readiness = computePlacementReadiness(overallScore);

  // Percentiles mapped to 0-100 scores using typical placement distribution
  const calcPercentile = (val: number | null, mean = 62, sd = 12): number => {
    if (val === null) return 50;
    const z = (val - mean) / sd;
    // Approximation of cumulative normal distribution
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    let p = 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (z < 0) p = 1 - p;
    return Math.min(99, Math.max(1, Math.round(p * 100)));
  };

  const structurePct = calcPercentile(structureScore, 60, 14);
  const contentPct = calcPercentile(contentScore, 58, 15);
  const fluencyPct = calcPercentile(fluencyScore, 64, 12);
  const voicePct = calcPercentile(voiceScore, 65, 12);

  return (
    <Card className="p-6 border-2 border-border bg-card/70 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase text-primary border-primary">
              National Placement Index
            </Badge>
            <span className="text-xs text-muted-foreground">Track: <span className="font-semibold text-foreground uppercase">{track}</span></span>
          </div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Campus Placement Readiness Dossier
          </h3>
        </div>

        <div className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${readiness.colorClass}`}>
          <ShieldCheck className="w-4 h-4" />
          <span>{readiness.band}</span>
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-4 rounded-lg bg-muted/40 border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase font-mono">Peer Comparison</div>
          <div className="text-base font-bold text-foreground">{readiness.percentileText}</div>
          <p className="text-xs text-muted-foreground max-w-xl">{readiness.description}</p>
        </div>

        <div className="flex items-center gap-3 bg-background/80 p-3 rounded-md border border-border flex-shrink-0">
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase font-mono">Conversion Index</div>
            <div className="text-2xl font-black text-primary">{readiness.probability}%</div>
          </div>
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* 4 Pillars Percentile Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-3 bg-card border rounded-lg space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">Structure</span>
            <span className="font-bold text-primary">Top {100 - structurePct}%</span>
          </div>
          <Progress value={structurePct} className="h-2" />
          <div className="text-[11px] text-muted-foreground">Framework logic & flow</div>
        </div>

        <div className="p-3 bg-card border rounded-lg space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">Content Depth</span>
            <span className="font-bold text-primary">Top {100 - contentPct}%</span>
          </div>
          <Progress value={contentPct} className="h-2" />
          <div className="text-[11px] text-muted-foreground">Fact density & substance</div>
        </div>

        <div className="p-3 bg-card border rounded-lg space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">Speaking Pace</span>
            <span className="font-bold text-primary">Top {100 - fluencyPct}%</span>
          </div>
          <Progress value={fluencyPct} className="h-2" />
          <div className="text-[11px] text-muted-foreground">WPM cadence stability</div>
        </div>

        <div className="p-3 bg-card border rounded-lg space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">Delivery & Demeanor</span>
            <span className="font-bold text-primary">Top {100 - voicePct}%</span>
          </div>
          <Progress value={voicePct} className="h-2" />
          <div className="text-[11px] text-muted-foreground">Clarity & low filler rate</div>
        </div>
      </div>
    </Card>
  );
};

export default PlacementBenchmarkCard;
