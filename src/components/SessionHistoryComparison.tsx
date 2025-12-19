import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calendar, BarChart3, 
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw 
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface SessionData {
  id: string;
  topic: string;
  topic_category: string;
  created_at: string;
  status: string;
  metrics: {
    fluency_score: number | null;
    content_score: number | null;
    structure_score: number | null;
    voice_score: number | null;
    total_words: number | null;
    filler_count: number | null;
    words_per_min: number | null;
    posture_score: number | null;
    eye_contact_score: number | null;
  } | null;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

const SessionHistoryComparison = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadSessionHistory();
    }
  }, [user, timeRange]);

  const loadSessionHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('gd_sessions')
        .select(`
          id,
          topic,
          topic_category,
          created_at,
          status,
          gd_metrics (
            fluency_score,
            content_score,
            structure_score,
            voice_score,
            total_words,
            filler_count,
            words_per_min,
            posture_score,
            eye_contact_score
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      // Apply time range filter
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = startOfDay(subDays(new Date(), days)).toISOString();
        query = query.gte('created_at', startDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data - only include sessions with human participant metrics
      const transformedSessions: SessionData[] = (data || [])
        .filter(s => {
          const metrics = s.gd_metrics?.[0];
          // Only include sessions where human participant had meaningful metrics
          return metrics && (
            metrics.fluency_score !== null || 
            metrics.content_score !== null ||
            metrics.total_words !== null
          );
        })
        .map(s => ({
          id: s.id,
          topic: s.topic,
          topic_category: s.topic_category || 'General',
          created_at: s.created_at,
          status: s.status,
          metrics: s.gd_metrics?.[0] || null
        }));

      setSessions(transformedSessions);

      // Extract unique categories
      const uniqueCategories = [...new Set(transformedSessions.map(s => s.topic_category))];
      setCategories(uniqueCategories);
    } catch (error: any) {
      console.error('Error loading session history:', error);
      toast({
        title: "Error loading history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter sessions by category
  const filteredSessions = selectedCategory === 'all' 
    ? sessions 
    : sessions.filter(s => s.topic_category === selectedCategory);

  // Calculate trend data for charts
  const trendData = filteredSessions.map((session, index) => ({
    name: format(new Date(session.created_at), 'MMM d'),
    date: session.created_at,
    fluency: session.metrics?.fluency_score || 0,
    content: session.metrics?.content_score || 0,
    structure: session.metrics?.structure_score || 0,
    voice: session.metrics?.voice_score || 0,
    wpm: session.metrics?.words_per_min || 0,
    fillers: session.metrics?.filler_count || 0,
    words: session.metrics?.total_words || 0,
    avgScore: session.metrics ? Math.round(
      ((session.metrics.fluency_score || 0) + 
       (session.metrics.content_score || 0) + 
       (session.metrics.structure_score || 0) + 
       (session.metrics.voice_score || 0)) / 4
    ) : 0,
    sessionNum: index + 1,
  }));

  // Calculate improvement metrics
  const calculateImprovement = () => {
    if (trendData.length < 2) return null;
    
    const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
    const secondHalf = trendData.slice(Math.floor(trendData.length / 2));
    
    const avgFirst = (metric: keyof typeof trendData[0]) => 
      firstHalf.reduce((acc, s) => acc + (s[metric] as number), 0) / firstHalf.length;
    const avgSecond = (metric: keyof typeof trendData[0]) => 
      secondHalf.reduce((acc, s) => acc + (s[metric] as number), 0) / secondHalf.length;
    
    return {
      fluency: Math.round(avgSecond('fluency') - avgFirst('fluency')),
      content: Math.round(avgSecond('content') - avgFirst('content')),
      structure: Math.round(avgSecond('structure') - avgFirst('structure')),
      voice: Math.round(avgSecond('voice') - avgFirst('voice')),
      avgScore: Math.round(avgSecond('avgScore') - avgFirst('avgScore')),
      wpm: Math.round(avgSecond('wpm') - avgFirst('wpm')),
      fillers: Math.round(avgSecond('fillers') - avgFirst('fillers')),
    };
  };

  const improvement = calculateImprovement();

  // Radar chart data for latest vs average
  const radarData = (() => {
    if (trendData.length === 0) return [];
    
    const latest = trendData[trendData.length - 1];
    const average = {
      fluency: Math.round(trendData.reduce((a, b) => a + b.fluency, 0) / trendData.length),
      content: Math.round(trendData.reduce((a, b) => a + b.content, 0) / trendData.length),
      structure: Math.round(trendData.reduce((a, b) => a + b.structure, 0) / trendData.length),
      voice: Math.round(trendData.reduce((a, b) => a + b.voice, 0) / trendData.length),
    };

    return [
      { metric: 'Fluency', latest: latest.fluency, average: average.fluency, fullMark: 100 },
      { metric: 'Content', latest: latest.content, average: average.content, fullMark: 100 },
      { metric: 'Structure', latest: latest.structure, average: average.structure, fullMark: 100 },
      { metric: 'Voice', latest: latest.voice, average: average.voice, fullMark: 100 },
    ];
  })();

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number, isFillers = false) => {
    if (isFillers) {
      // For fillers, lower is better
      if (value < 0) return 'text-green-500';
      if (value > 0) return 'text-destructive';
      return 'text-muted-foreground';
    }
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <Card className="p-6 border-4 border-border">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span className="font-mono">Loading session history...</span>
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-6 border-4 border-border">
        <div className="text-center py-12 space-y-4">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-bold">NO SESSION HISTORY</h3>
          <p className="text-sm text-muted-foreground font-mono">
            Complete some practice sessions to see your progress over time.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card className="p-4 border-4 border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              SESSION HISTORY COMPARISON
            </h2>
            <p className="text-sm text-muted-foreground font-mono">
              Track your human participant performance over time
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[130px] border-2">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px] border-2">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Improvement Summary */}
      {improvement && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Avg Score', value: improvement.avgScore, key: 'avgScore' },
            { label: 'Fluency', value: improvement.fluency, key: 'fluency' },
            { label: 'Content', value: improvement.content, key: 'content' },
            { label: 'Structure', value: improvement.structure, key: 'structure' },
            { label: 'Voice', value: improvement.voice, key: 'voice' },
            { label: 'WPM', value: improvement.wpm, key: 'wpm' },
            { label: 'Fillers', value: improvement.fillers, key: 'fillers', isFillers: true },
          ].map(({ label, value, isFillers }) => (
            <Card key={label} className="p-3 border-2 border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(isFillers ? -value : value)}
                <span className={`font-bold text-lg ${getTrendColor(value, isFillers)}`}>
                  {value > 0 ? '+' : ''}{value}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground">vs first half</p>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Trend Line Chart */}
        <Card className="p-4 border-4 border-border">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            PERFORMANCE TREND
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis domain={[0, 100]} fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--background))', 
                    border: '2px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="fluency" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Fluency" />
                <Line type="monotone" dataKey="content" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} name="Content" />
                <Line type="monotone" dataKey="structure" stroke="hsl(48, 96%, 53%)" strokeWidth={2} dot={{ r: 3 }} name="Structure" />
                <Line type="monotone" dataKey="voice" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={{ r: 3 }} name="Voice" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Latest vs Average Radar */}
        <Card className="p-4 border-4 border-border">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            LATEST VS AVERAGE
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} />
                <Radar name="Latest" dataKey="latest" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                <Radar name="Average" dataKey="average" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.2} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* WPM and Fillers Trend */}
        <Card className="p-4 border-4 border-border">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            WPM & FILLER TREND
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis yAxisId="left" fontSize={10} />
                <YAxis yAxisId="right" orientation="right" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--background))', 
                    border: '2px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar yAxisId="left" dataKey="wpm" fill="hsl(var(--primary))" name="WPM" />
                <Bar yAxisId="right" dataKey="fillers" fill="hsl(var(--destructive))" name="Fillers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Session List */}
        <Card className="p-4 border-4 border-border">
          <h3 className="font-bold text-sm mb-4">SESSION DETAILS</h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {filteredSessions.slice().reverse().map((session) => {
                const avgScore = session.metrics ? Math.round(
                  ((session.metrics.fluency_score || 0) + 
                   (session.metrics.content_score || 0) + 
                   (session.metrics.structure_score || 0) + 
                   (session.metrics.voice_score || 0)) / 4
                ) : 0;

                return (
                  <div key={session.id} className="p-3 border-2 border-border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{session.topic}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {session.topic_category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(session.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{avgScore}%</p>
                        <p className="text-[10px] text-muted-foreground">
                          {session.metrics?.words_per_min || 0} WPM
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default SessionHistoryComparison;