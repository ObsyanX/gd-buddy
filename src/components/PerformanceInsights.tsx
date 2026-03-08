import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Insight {
  title: string;
  description: string;
  type: "strength" | "improvement" | "suggestion";
  priority: number;
}

const typeConfig = {
  strength: { icon: TrendingUp, badgeVariant: "secondary" as const, label: "Strength" },
  improvement: { icon: AlertTriangle, badgeVariant: "destructive" as const, label: "Improve" },
  suggestion: { icon: Lightbulb, badgeVariant: "outline" as const, label: "Tip" },
};

const PerformanceInsights = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('performance-insights');
      if (error) throw error;
      setInsights(data?.insights || []);
      setLoaded(true);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border-4 border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-bold">AI INSIGHTS</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          disabled={loading}
          className="border-2 text-xs"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
          {loaded ? 'Refresh' : 'Generate'}
        </Button>
      </div>

      {!loaded && !loading && (
        <p className="text-sm text-muted-foreground font-mono text-center py-4">
          Click Generate to get personalized AI coaching insights based on your practice history.
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {loaded && insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, idx) => {
            const config = typeConfig[insight.type] || typeConfig.suggestion;
            const Icon = config.icon;
            return (
              <div key={idx} className="p-3 border-2 border-border rounded space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-bold">{insight.title}</span>
                  </div>
                  <Badge variant={config.badgeVariant} className="text-[10px] flex-shrink-0">
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                  {insight.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {loaded && insights.length === 0 && (
        <p className="text-sm text-muted-foreground font-mono text-center py-4">
          No insights generated. Try practicing more sessions first!
        </p>
      )}
    </Card>
  );
};

export default PerformanceInsights;
