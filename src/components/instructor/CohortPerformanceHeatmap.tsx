import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Download,
  TrendingDown,
  CheckCircle2,
  Users,
  Target,
  Activity,
  BarChart3,
  MessageSquare,
  Mic2,
} from "lucide-react";

export interface StudentMetricRow {
  userId: string;
  name: string;
  sessionsCompleted: number;

  contentScore: number;
  fluencyScore: number;
  structureScore: number;

  // Fillers per minute
  fillerWordDensity: number;

  conclusionScore: number;
}

interface CohortPerformanceHeatmapProps {
  cohortName: string;
  data: StudentMetricRow[];
}

interface CohortAnalysis {
  avgContent: number;
  avgFluency: number;
  avgStructure: number;
  avgConclusion: number;
  avgFillers: number;
  overallScore: number;

  highFillerPct: number;
  weakConclusionPct: number;
  lowStructurePct: number;
  lowContentPct: number;
  lowFluencyPct: number;
}

const round = (value: number) => Math.round(value);

const average = (values: number[]) => {
  if (!values.length) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const CohortPerformanceHeatmap: React.FC<
  CohortPerformanceHeatmapProps
> = ({ cohortName, data }) => {
  /*
   * ------------------------------------------------------------
   * COHORT ANALYSIS
   * ------------------------------------------------------------
   */

  const analysis = useMemo<CohortAnalysis | null>(() => {
    if (!data.length) return null;

    const avgContent = round(
      average(data.map((student) => student.contentScore))
    );

    const avgFluency = round(
      average(data.map((student) => student.fluencyScore))
    );

    const avgStructure = round(
      average(data.map((student) => student.structureScore))
    );

    const avgConclusion = round(
      average(data.map((student) => student.conclusionScore))
    );

    const avgFillers = Number(
      average(data.map((student) => student.fillerWordDensity)).toFixed(1)
    );

    const overallScore = round(
      average([
        avgContent,
        avgFluency,
        avgStructure,
        avgConclusion,
      ])
    );

    const highFillerPct = round(
      (data.filter((student) => student.fillerWordDensity > 4.5).length /
        data.length) *
        100
    );

    const weakConclusionPct = round(
      (data.filter((student) => student.conclusionScore < 60).length /
        data.length) *
        100
    );

    const lowStructurePct = round(
      (data.filter((student) => student.structureScore < 60).length /
        data.length) *
        100
    );

    const lowContentPct = round(
      (data.filter((student) => student.contentScore < 60).length /
        data.length) *
        100
    );

    const lowFluencyPct = round(
      (data.filter((student) => student.fluencyScore < 60).length /
        data.length) *
        100
    );

    return {
      avgContent,
      avgFluency,
      avgStructure,
      avgConclusion,
      avgFillers,
      overallScore,
      highFillerPct,
      weakConclusionPct,
      lowStructurePct,
      lowContentPct,
      lowFluencyPct,
    };
  }, [data]);

  /*
   * ------------------------------------------------------------
   * SORTING
   * ------------------------------------------------------------
   *
   * Strongest candidates appear first.
   */

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const scoreA = average([
        a.contentScore,
        a.fluencyScore,
        a.structureScore,
        a.conclusionScore,
      ]);

      const scoreB = average([
        b.contentScore,
        b.fluencyScore,
        b.structureScore,
        b.conclusionScore,
      ]);

      return scoreB - scoreA;
    });
  }, [data]);

  /*
   * ------------------------------------------------------------
   * HEATMAP COLORS
   * ------------------------------------------------------------
   */

  const getColorClass = (
    value: number,
    isFiller: boolean = false
  ) => {
    if (isFiller) {
      if (value > 5) {
        return "bg-destructive/20 text-destructive border-destructive/40";
      }

      if (value > 3) {
        return "bg-amber-500/20 text-amber-500 border-amber-500/40";
      }

      return "bg-emerald-500/20 text-emerald-500 border-emerald-500/40";
    }

    if (value >= 85) {
      return "bg-emerald-500/30 text-emerald-400 border-emerald-500/40";
    }

    if (value >= 75) {
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }

    if (value >= 60) {
      return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    }

    return "bg-destructive/20 text-destructive border-destructive/40";
  };

  /*
   * ------------------------------------------------------------
   * OVERALL SCORE
   * ------------------------------------------------------------
   */

  const getOverallScore = (student: StudentMetricRow) => {
    return round(
      average([
        student.contentScore,
        student.fluencyScore,
        student.structureScore,
        student.conclusionScore,
      ])
    );
  };

  /*
   * ------------------------------------------------------------
   * EXPORT CSV
   * ------------------------------------------------------------
   */

  const exportCSV = () => {
    const headers = [
      "Candidate Name",
      "Sessions",
      "Content",
      "Fluency",
      "Structure",
      "Conclusion",
      "Fillers/Min",
      "Overall",
    ];

    const rows = sortedData.map((student) => [
      `"${student.name.replace(/"/g, '""')}"`,
      student.sessionsCompleted,
      student.contentScore,
      student.fluencyScore,
      student.structureScore,
      student.conclusionScore,
      student.fillerWordDensity,
      getOverallScore(student),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${cohortName.replace(
      /\s+/g,
      "_"
    )}_placement_heatmap.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  /*
   * ------------------------------------------------------------
   * EMPTY STATE
   * ------------------------------------------------------------
   */

  if (!data.length) {
    return (
      <Card className="p-8 border-2 border-border text-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-muted-foreground" />
          </div>

          <h3 className="mt-4 font-semibold">
            No performance data yet
          </h3>

          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            No evaluation metrics have been recorded for this
            cohort yet. Students will appear here after completing
            GD practice sessions.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* ======================================================
          COHORT SUMMARY
      ======================================================= */}

      {analysis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Students */}

          <Card className="p-4 border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />

              <span className="text-xs font-medium">
                Students
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold">
              {data.length}
            </p>
          </Card>

          {/* Sessions */}

          <Card className="p-4 border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="w-4 h-4" />

              <span className="text-xs font-medium">
                Sessions
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold">
              {data.reduce(
                (sum, student) =>
                  sum + student.sessionsCompleted,
                0
              )}
            </p>
          </Card>

          {/* Overall */}

          <Card className="p-4 border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-4 h-4" />

              <span className="text-xs font-medium">
                Overall
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold">
              {analysis.overallScore}%
            </p>
          </Card>

          {/* Content */}

          <Card className="p-4 border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="w-4 h-4" />

              <span className="text-xs font-medium">
                Content
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold">
              {analysis.avgContent}%
            </p>
          </Card>

          {/* Fluency */}

          <Card className="p-4 border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mic2 className="w-4 h-4" />

              <span className="text-xs font-medium">
                Fluency
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold">
              {analysis.avgFluency}%
            </p>
          </Card>

          {/* Fillers */}

          <Card className="p-4 border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" />

              <span className="text-xs font-medium">
                Fillers/Min
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold">
              {analysis.avgFillers}
            </p>
          </Card>
        </div>
      )}

      {/* ======================================================
          SYSTEMIC WEAKNESS ANALYSIS
      ======================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {analysis && analysis.weakConclusionPct >= 40 && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />

            <div>
              <p className="text-xs font-bold text-destructive uppercase tracking-wider">
                Systemic Weakness: Conclusion
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                <strong className="text-foreground">
                  {analysis.weakConclusionPct}%
                </strong>{" "}
                of candidates struggle with synthesis and
                closing summaries.
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

              <p className="text-xs text-muted-foreground mt-1">
                <strong className="text-foreground">
                  {analysis.highFillerPct}%
                </strong>{" "}
                exceed 4.5 filler words/min under pressure.
              </p>
            </div>
          </div>
        )}

        {analysis && analysis.lowStructurePct >= 40 && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />

            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                Structural Gap
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                <strong className="text-foreground">
                  {analysis.lowStructurePct}%
                </strong>{" "}
                of candidates are below the 60-point
                structure benchmark.
              </p>
            </div>
          </div>
        )}

        {analysis &&
          analysis.lowContentPct >= 40 && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />

              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                  Content Depth Gap
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  <strong className="text-foreground">
                    {analysis.lowContentPct}%
                  </strong>{" "}
                  of candidates are below the 60-point
                  content benchmark.
                </p>
              </div>
            </div>
          )}

        {analysis &&
          analysis.lowFluencyPct >= 40 && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <TrendingDown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />

              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                  Fluency Gap
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  <strong className="text-foreground">
                    {analysis.lowFluencyPct}%
                  </strong>{" "}
                  of candidates are below the 60-point
                  fluency benchmark.
                </p>
              </div>
            </div>
          )}

        {analysis &&
          analysis.lowStructurePct < 40 &&
          analysis.weakConclusionPct < 40 &&
          analysis.highFillerPct < 40 && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

              <div>
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                  Solid Foundation
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  The cohort currently has no major systemic
                  weakness across structure, conclusion or
                  speech fluidity.
                </p>
              </div>
            </div>
          )}
      </div>

      {/* ======================================================
          COMPETENCY MATRIX
      ======================================================= */}

      <Card className="border-2 border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />

                <h3 className="text-sm font-bold tracking-wide uppercase font-mono">
                  Candidate Competency Matrix
                </h3>
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                {data.length} enrolled candidates · ranked by
                overall performance
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="h-8 gap-1.5 text-xs self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Desktop / Tablet */}

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground text-left bg-muted/20">
                <th className="py-3 px-3">
                  Student
                </th>

                <th className="py-3 px-2 text-center">
                  Sessions
                </th>

                <th className="py-3 px-2 text-center">
                  Content
                </th>

                <th className="py-3 px-2 text-center">
                  Fluency
                </th>

                <th className="py-3 px-2 text-center">
                  Structure
                </th>

                <th className="py-3 px-2 text-center">
                  Conclusion
                </th>

                <th className="py-3 px-2 text-center">
                  Fillers/Min
                </th>

                <th className="py-3 px-3 text-center">
                  Overall
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/40">
              {sortedData.map((row, index) => {
                const overall = getOverallScore(row);

                return (
                  <tr
                    key={row.userId}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Student */}

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {index + 1}
                        </div>

                        <div>
                          <p className="font-semibold text-foreground">
                            {row.name}
                          </p>

                          <p className="text-[10px] text-muted-foreground">
                            {row.userId.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Sessions */}

                    <td className="py-3 px-2 text-center">
                      <Badge
                        variant="outline"
                        className="font-mono"
                      >
                        {row.sessionsCompleted}
                      </Badge>
                    </td>

                    {/* Content */}

                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded border text-[11px] font-bold ${getColorClass(
                          row.contentScore
                        )}`}
                      >
                        {row.contentScore}
                      </span>
                    </td>

                    {/* Fluency */}

                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded border text-[11px] font-bold ${getColorClass(
                          row.fluencyScore
                        )}`}
                      >
                        {row.fluencyScore}
                      </span>
                    </td>

                    {/* Structure */}

                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded border text-[11px] font-bold ${getColorClass(
                          row.structureScore
                        )}`}
                      >
                        {row.structureScore}
                      </span>
                    </td>

                    {/* Conclusion */}

                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded border text-[11px] font-bold ${getColorClass(
                          row.conclusionScore
                        )}`}
                      >
                        {row.conclusionScore}
                      </span>
                    </td>

                    {/* Fillers */}

                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded border text-[11px] font-bold ${getColorClass(
                          row.fillerWordDensity,
                          true
                        )}`}
                      >
                        {row.fillerWordDensity.toFixed(1)}
                      </span>
                    </td>

                    {/* Overall */}

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block min-w-[58px] px-2.5 py-1 rounded-full border text-[11px] font-bold ${getColorClass(
                          overall
                        )}`}
                      >
                        {overall}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Cohort Average */}

            {analysis && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                  <td className="py-3 px-3">
                    Cohort Average
                  </td>

                  <td className="py-3 px-2 text-center">
                    {(
                      data.reduce(
                        (sum, student) =>
                          sum + student.sessionsCompleted,
                        0
                      ) / data.length
                    ).toFixed(1)}
                  </td>

                  <td className="py-3 px-2 text-center">
                    {analysis.avgContent}
                  </td>

                  <td className="py-3 px-2 text-center">
                    {analysis.avgFluency}
                  </td>

                  <td className="py-3 px-2 text-center">
                    {analysis.avgStructure}
                  </td>

                  <td className="py-3 px-2 text-center">
                    {analysis.avgConclusion}
                  </td>

                  <td className="py-3 px-2 text-center">
                    {analysis.avgFillers}
                  </td>

                  <td className="py-3 px-3 text-center">
                    {analysis.overallScore}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ====================================================
            MOBILE CARDS
        ===================================================== */}

        <div className="md:hidden divide-y divide-border/50">
          {sortedData.map((row, index) => {
            const overall = getOverallScore(row);

            return (
              <div key={row.userId} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {row.name}
                      </p>

                      <p className="text-[10px] text-muted-foreground">
                        {row.sessionsCompleted} sessions
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-bold ${getColorClass(
                      overall
                    )}`}
                  >
                    {overall}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <MetricCard
                    label="Content"
                    value={row.contentScore}
                    colorClass={getColorClass(row.contentScore)}
                  />

                  <MetricCard
                    label="Fluency"
                    value={row.fluencyScore}
                    colorClass={getColorClass(row.fluencyScore)}
                  />

                  <MetricCard
                    label="Structure"
                    value={row.structureScore}
                    colorClass={getColorClass(row.structureScore)}
                  />

                  <MetricCard
                    label="Conclusion"
                    value={row.conclusionScore}
                    colorClass={getColorClass(row.conclusionScore)}
                  />

                  <MetricCard
                    label="Fillers / Min"
                    value={row.fillerWordDensity.toFixed(1)}
                    colorClass={getColorClass(
                      row.fillerWordDensity,
                      true
                    )}
                  />

                  <MetricCard
                    label="Sessions"
                    value={row.sessionsCompleted}
                    colorClass="bg-muted/30 border-border"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ====================================================
            LEGEND
        ===================================================== */}

        <div className="border-t border-border px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Score:
          </span>

          <Legend
            className="bg-emerald-500/30 border-emerald-500/40"
            label="85+"
          />

          <Legend
            className="bg-emerald-500/20 border-emerald-500/30"
            label="75–84"
          />

          <Legend
            className="bg-amber-500/20 border-amber-500/40"
            label="60–74"
          />

          <Legend
            className="bg-destructive/20 border-destructive/40"
            label="<60"
          />

          <span className="hidden sm:inline text-xs text-muted-foreground ml-auto">
            Filler benchmark: ≤3 good · 3–5 watch · &gt;5 high
          </span>
        </div>
      </Card>
    </div>
  );
};

/*
 * ------------------------------------------------------------
 * MOBILE METRIC CARD
 * ------------------------------------------------------------
 */

interface MetricCardProps {
  label: string;
  value: number | string;
  colorClass: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  colorClass,
}) => {
  return (
    <div
      className={`rounded-lg border p-3 ${colorClass}`}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold">
        {value}
      </p>
    </div>
  );
};

/*
 * ------------------------------------------------------------
 * LEGEND
 * ------------------------------------------------------------
 */

interface LegendProps {
  className: string;
  label: string;
}

const Legend: React.FC<LegendProps> = ({
  className,
  label,
}) => {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-3 h-3 rounded-sm border ${className}`}
      />

      <span className="text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
};

export default CohortPerformanceHeatmap;
