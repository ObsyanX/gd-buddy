import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, TrendingDown, CheckCircle2 } from 'lucide-react';

export interface StudentMetricRow {
  userId: string;
  name: string;
  sessionsCompleted: number;
  contentScore: number;
  fluencyScore: number;
  structureScore: number;
  fillerWordDensity: number; // fillers per minute
  conclusionScore: number;
}

interface CohortPerformanceHeatmapProps {
  cohortName: string;
  data: StudentMetricRow[];
}

export const CohortPerformanceHeatmap: React.FC<CohortPerformanceHeatmapProps> = ({
  cohortName,
  data,
}) => {
  // Aggregate batch statistics and identify systemic weaknesses
  const analysis = useMemo(() => {
    if (!data.length) return null;

    const count = data.length;
    const avgContent = Math.round(data.reduce((acc, r) => acc + r.contentScore, 0) / count);
    const avgFluency = Math.round(data.reduce((acc, r) => acc + r.fluencyScore, 0) / count);
    const avgStructure = Math.round(data.reduce((acc, r) => acc + r.structureScore, 0) / count);
    const avgConclusion = Math.round(data.reduce((acc, r) => acc + r.conclusionScore, 0) / count);
    const highFillerPct = Math.round(
      (data.filter((r) => r.fillerWordDensity > 4.5).length / count) * 100
    );
    const weakConclusionPct = Math.round(
      (data.filter((r) => r.conclusionScore < 60).length / count) * 100
    );
    const lowStructurePct = Math.round(
      (data.filter((r) => r.structureScore < 60).length / count) * 100
    );

    return {
      avgContent,
      avgFluency,
      avgStructure,
      avgConclusion,
      highFillerPct,
      weakConclusionPct,
      lowStructurePct,
    };
  }, [data]);

  const getColorClass = (val: number, isFiller: boolean = false) => {
    if (isFiller) {
      if (val > 5.0) return 'bg-destructive/20 text-destructive border-destructive/40';
      if (val > 3.0) return 'bg-amber-500/20 text-amber-500 border-amber-500/40';
      return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40';
    }
    if (val >= 75) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (val >= 60) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-destructive/20 text-destructive border-destructive/40';
  };

  const exportCSV = () => {
    const headers = ['Candidate Name,Sessions,Content,Fluency,Structure,Conclusion,Fillers/Min\n'];
    const rows = data.map(
      (r) =>
        `"${r.name}",${r.sessionsCompleted},${r.contentScore},${r.fluencyScore},${r.structureScore},${r.conclusionScore},${r.fillerWordDensity}\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cohortName.replace(/\s+/g, '_')}_placement_heatmap.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data.length) {
    return (
      <Card className="p-6 border-2 border-border text-center text-muted-foreground font-mono">
        No evaluation metrics recorded yet for this cohort.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batch Systemic Weakness Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {analysis && analysis.weakConclusionPct >= 40 && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-destructive uppercase tracking-wider">
                Systemic Weakness: Conclusion
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <strong className="text-foreground">{analysis.weakConclusionPct}%</strong> of candidates struggle with synthesis and closing summaries.
              </p>
            </div>
          </div>
        )}

        {analysis && analysis.highFillerPct >= 40 && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <TrendingDown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                Speech Fluidity Gap
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <strong className="text-foreground">{analysis.highFillerPct}%</strong> exceed 4.5 filler words/min under pressure.
              </p>
            </div>
          </div>
        )}

        {analysis && analysis.lowStructurePct < 40 && analysis.weakConclusionPct < 40 && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                Solid Foundation
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Average structure and framework adherence is healthy across the batch.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Grid */}
      <Card className="p-4 border-2 border-border overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold tracking-wide uppercase font-mono">
            Candidate Competency Matrix ({data.length} Enrolled)
          </h3>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>

        <table className="w-full text-xs font-mono border-collapse min-w-[620px]">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground text-left">
              <th className="py-2.5 px-3">Student Name</th>
              <th className="py-2.5 px-2 text-center">Sessions</th>
              <th className="py-2.5 px-2 text-center">Content</th>
              <th className="py-2.5 px-2 text-center">Fluency</th>
              <th className="py-2.5 px-2 text-center">Structure</th>
              <th className="py-2.5 px-2 text-center">Conclusion</th>
              <th className="py-2.5 px-2 text-center">Fillers/Min</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.map((row) => (
              <tr key={row.userId} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-foreground">{row.name}</td>
                <td className="py-2.5 px-2 text-center">{row.sessionsCompleted}</td>
                <td className="py-2.5 px-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${getColorClass(row.contentScore)}`}>
                    {row.contentScore}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${getColorClass(row.fluencyScore)}`}>
                    {row.fluencyScore}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${getColorClass(row.structureScore)}`}>
                    {row.structureScore}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${getColorClass(row.conclusionScore)}`}>
                    {row.conclusionScore}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${getColorClass(row.fillerWordDensity, true)}`}>
                    {row.fillerWordDensity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
