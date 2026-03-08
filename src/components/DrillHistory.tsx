import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, TrendingUp, Clock, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface DrillRecord {
  id: string;
  drill_type: string;
  topic: string;
  score: number | null;
  ai_feedback: string | null;
  completed_at: string | null;
  created_at: string;
  time_limit_seconds: number | null;
  user_response: string | null;
}

const DRILL_TYPE_LABELS: Record<string, string> = {
  opening_statement: "Opening Statement",
  star_response: "STAR Response",
  rebuttal: "Rebuttal",
  time_boxed: "Time-Boxed",
};

export default function DrillHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DrillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("skill_drills")
        .select("*")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setRecords(data as DrillRecord[]);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [user]);

  if (!user) return null;

  const avgScore =
    records.length > 0
      ? Math.round(records.filter((r) => r.score !== null).reduce((sum, r) => sum + (r.score || 0), 0) / records.filter((r) => r.score !== null).length)
      : 0;

  const scoredRecords = records.filter((r) => r.score !== null);
  const recentTrend =
    scoredRecords.length >= 2
      ? (scoredRecords[0].score || 0) - (scoredRecords[scoredRecords.length - 1].score || 0)
      : 0;

  const drillTypeCounts = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.drill_type] = (acc[r.drill_type] || 0) + 1;
    return acc;
  }, {});

  const parseFeedback = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  return (
    <Card className="p-4 sm:p-6 border-4 border-border">
      <Tabs defaultValue="history">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5" />
            DRILL HISTORY
          </h2>
          <TabsList className="h-8">
            <TabsTrigger value="history" className="text-xs px-3 h-7">History</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs px-3 h-7">Stats</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="stats" className="mt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground font-mono py-4 text-center">Loading stats...</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground font-mono py-4 text-center">
              No completed drills yet. Start a drill to begin tracking your progress.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-3 border-2 border-border text-center space-y-1">
                <p className="text-2xl sm:text-3xl font-bold">{records.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">DRILLS COMPLETED</p>
              </Card>
              <Card className="p-3 border-2 border-border text-center space-y-1">
                <p className="text-2xl sm:text-3xl font-bold">{avgScore}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">AVG SCORE</p>
              </Card>
              <Card className="p-3 border-2 border-border text-center space-y-1">
                <p className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-1">
                  {recentTrend >= 0 ? "+" : ""}
                  {recentTrend}
                  <TrendingUp className={`w-4 h-4 ${recentTrend >= 0 ? "text-green-600" : "text-destructive"}`} />
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">SCORE TREND</p>
              </Card>
              <Card className="p-3 border-2 border-border text-center space-y-1">
                <p className="text-2xl sm:text-3xl font-bold">
                  {Object.keys(drillTypeCounts).length}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">DRILL TYPES</p>
              </Card>

              {Object.entries(drillTypeCounts).length > 0 && (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-xs font-bold text-muted-foreground mb-2">BREAKDOWN BY TYPE</p>
                  <div className="space-y-2">
                    {Object.entries(drillTypeCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-xs font-mono w-28 sm:w-36 truncate">
                            {DRILL_TYPE_LABELS[type] || type}
                          </span>
                          <Progress value={(count / records.length) * 100} className="h-2 flex-1 border border-border" />
                          <span className="text-xs font-mono text-muted-foreground w-6 text-right">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground font-mono py-4 text-center">Loading history...</p>
          ) : records.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-border rounded">
              <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground font-mono">
                No completed drills yet. Complete a drill to see your history here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[360px] sm:h-[420px]">
              <div className="space-y-3 pr-2">
                {records.map((record) => {
                  const fb = parseFeedback(record.ai_feedback);
                  const isExpanded = expandedId === record.id;

                  return (
                    <Card
                      key={record.id}
                      className="p-3 sm:p-4 border-2 border-border hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              {DRILL_TYPE_LABELS[record.drill_type] || record.drill_type}
                            </Badge>
                            {record.time_limit_seconds && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                {record.time_limit_seconds}s
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-medium leading-tight line-clamp-1">{record.topic}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                            {record.completed_at
                              ? format(new Date(record.completed_at), "MMM d, yyyy · h:mm a")
                              : "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {record.score !== null && (
                            <span className={`text-lg sm:text-xl font-bold ${record.score >= 70 ? "text-green-600" : record.score >= 40 ? "text-yellow-600" : "text-destructive"}`}>
                              {record.score}%
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border space-y-3">
                          {record.user_response && (
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground mb-1">YOUR RESPONSE</p>
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                                "{record.user_response}"
                              </p>
                            </div>
                          )}
                          {fb?.strengths && fb.strengths.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-green-600 mb-1">STRENGTHS</p>
                              <ul className="space-y-0.5">
                                {fb.strengths.slice(0, 3).map((s: string, i: number) => (
                                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                    <span className="text-green-600">•</span>{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {fb?.improvements && fb.improvements.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-destructive mb-1">TO IMPROVE</p>
                              <ul className="space-y-0.5">
                                {fb.improvements.slice(0, 3).map((s: string, i: number) => (
                                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                    <span className="text-destructive">•</span>{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {fb?.specific_tip && (
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground mb-1">TIP</p>
                              <p className="text-xs text-muted-foreground">{fb.specific_tip}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
