import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
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
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, AlertTriangle 
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

// Participant-scoped session data derived from actual logged events
interface ParticipantSessionData {
  sessionId: string;
  participantId: string;
  topic: string;
  topicCategory: string;
  createdAt: string;
  // Metrics computed from participant's actual messages
  metrics: {
    totalWords: number;
    fillerCount: number;
    wordsPerMin: number;
    messageCount: number;
    speakingTimeSeconds: number;
  };
  // Scores from gd_metrics (if available and attributable to this participant)
  scores: {
    fluency: number | null;
    content: number | null;
    structure: number | null;
    voice: number | null;
  };
  // Data source verification
  dataSource: {
    messagesLogged: boolean;
    metricsRecordExists: boolean;
    speakingTimeEstimated: boolean;
  };
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

// Utility to clean streaming artifacts from transcribed text
const cleanStreamingArtifacts = (text: string): string => {
  if (!text) return '';
  const words = text.split(/\s+/).filter(Boolean);
  const cleanedWords: string[] = [];
  let lastWord = '';
  let repeatCount = 0;
  
  for (const word of words) {
    const normalizedWord = word.toLowerCase().replace(/[.,!?;:'"()[\]{}]/g, '');
    const normalizedLast = lastWord.toLowerCase().replace(/[.,!?;:'"()[\]{}]/g, '');
    
    if (normalizedWord === normalizedLast) {
      repeatCount++;
      if (repeatCount < 2) {
        cleanedWords.push(word);
      }
    } else {
      cleanedWords.push(word);
      repeatCount = 0;
    }
    lastWord = word;
  }
  
  return cleanedWords.join(' ');
};

// Count filler words in text
const countFillerWords = (text: string): number => {
  const fillerPatterns = [
    /\bum+\b/gi, /\buh+\b/gi, /\ber+\b/gi, /\bah+\b/gi,
    /\blike\b/gi, /\byou know\b/gi, /\bactually\b/gi,
    /\bbasically\b/gi, /\bliterally\b/gi, /\bso+\b/gi,
    /\bwell\b/gi, /\bi mean\b/gi, /\bkind of\b/gi,
    /\bsort of\b/gi, /\bright\b/gi
  ];
  
  let count = 0;
  for (const pattern of fillerPatterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
};

const SessionHistoryComparison = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ParticipantSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [dataGaps, setDataGaps] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadParticipantHistory();
    }
  }, [user, timeRange]);

  const loadParticipantHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const gaps: string[] = [];
    
    try {
      // Step 1: Get all sessions where this user was a participant
      let sessionQuery = supabase
        .from('gd_sessions')
        .select(`
          id,
          topic,
          topic_category,
          created_at,
          status,
          start_time,
          end_time,
          is_multiplayer
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      // Apply time range filter
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = startOfDay(subDays(new Date(), days)).toISOString();
        sessionQuery = sessionQuery.gte('created_at', startDate);
      }

      const { data: sessionsData, error: sessionsError } = await sessionQuery;
      if (sessionsError) throw sessionsError;

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([]);
        setCategories([]);
        setIsLoading(false);
        return;
      }

      // Step 2: Get all participant records for this user
      const sessionIds = sessionsData.map(s => s.id);
      const { data: participantsData, error: participantsError } = await supabase
        .from('gd_participants')
        .select('id, session_id, is_user, persona_name, real_user_id')
        .in('session_id', sessionIds)
        .or(`real_user_id.eq.${user.id},is_user.eq.true`);

      if (participantsError) throw participantsError;

      // Filter to only this user's participant records
      const myParticipants = (participantsData || []).filter(p => 
        p.real_user_id === user.id || (p.is_user && !p.real_user_id)
      );

      if (myParticipants.length === 0) {
        gaps.push('No participant records found for your sessions');
        setSessions([]);
        setDataGaps(gaps);
        setIsLoading(false);
        return;
      }

      const myParticipantIds = myParticipants.map(p => p.id);
      const participantSessionMap = new Map(myParticipants.map(p => [p.session_id, p.id]));

      // Step 3: Get all messages from this user's participant IDs
      const { data: messagesData, error: messagesError } = await supabase
        .from('gd_messages')
        .select('id, session_id, participant_id, text, start_ts, end_ts')
        .in('participant_id', myParticipantIds)
        .order('start_ts', { ascending: true });

      if (messagesError) throw messagesError;

      // Step 4: Get metrics records for these sessions
      const { data: metricsData, error: metricsError } = await supabase
        .from('gd_metrics')
        .select('*')
        .in('session_id', sessionIds);

      if (metricsError) throw metricsError;

      // Create a map of session_id to metrics
      const metricsMap = new Map((metricsData || []).map(m => [m.session_id, m]));

      // Step 5: Compute participant-scoped metrics for each session
      const participantSessions: ParticipantSessionData[] = [];

      for (const session of sessionsData) {
        const participantId = participantSessionMap.get(session.id);
        if (!participantId) continue;

        // Get only this participant's messages
        const myMessages = (messagesData || []).filter(
          m => m.session_id === session.id && m.participant_id === participantId
        );

        const hasMessages = myMessages.length > 0;

        // Calculate metrics from actual message data
        let totalWords = 0;
        let fillerCount = 0;
        let speakingTimeSeconds = 0;
        let speakingTimeEstimated = false;

        for (const msg of myMessages) {
          const cleanedText = cleanStreamingArtifacts(msg.text || '');
          const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
          totalWords += wordCount;
          fillerCount += countFillerWords(cleanedText);

          // Calculate speaking time from timestamps if available
          if (msg.start_ts && msg.end_ts) {
            const start = new Date(msg.start_ts).getTime();
            const end = new Date(msg.end_ts).getTime();
            if (end > start) {
              speakingTimeSeconds += (end - start) / 1000;
            }
          } else {
            // Estimate based on word count (~150 WPM average)
            speakingTimeSeconds += (wordCount / 150) * 60;
            speakingTimeEstimated = true;
          }
        }

        // Calculate WPM (only if meaningful speaking time)
        let wordsPerMin = 0;
        if (speakingTimeSeconds >= 5 && totalWords >= 10) {
          wordsPerMin = Math.round((totalWords / speakingTimeSeconds) * 60);
        }

        // Get session-level metrics (may or may not be participant-specific)
        const sessionMetrics = metricsMap.get(session.id);
        const metricsRecordExists = !!sessionMetrics;

        // Only include sessions where this participant had actual activity
        if (!hasMessages && !metricsRecordExists) {
          continue;
        }

        participantSessions.push({
          sessionId: session.id,
          participantId: participantId,
          topic: session.topic,
          topicCategory: session.topic_category || 'General',
          createdAt: session.created_at,
          metrics: {
            totalWords,
            fillerCount,
            wordsPerMin,
            messageCount: myMessages.length,
            speakingTimeSeconds: Math.round(speakingTimeSeconds),
          },
          scores: {
            fluency: sessionMetrics?.fluency_score ?? null,
            content: sessionMetrics?.content_score ?? null,
            structure: sessionMetrics?.structure_score ?? null,
            voice: sessionMetrics?.voice_score ?? null,
          },
          dataSource: {
            messagesLogged: hasMessages,
            metricsRecordExists,
            speakingTimeEstimated,
          },
        });
      }

      // Track data gaps
      const sessionsWithoutMessages = participantSessions.filter(s => !s.dataSource.messagesLogged);
      if (sessionsWithoutMessages.length > 0) {
        gaps.push(`${sessionsWithoutMessages.length} session(s) have no logged messages`);
      }

      const sessionsWithEstimatedTime = participantSessions.filter(s => s.dataSource.speakingTimeEstimated);
      if (sessionsWithEstimatedTime.length > 0) {
        gaps.push(`${sessionsWithEstimatedTime.length} session(s) have estimated speaking time`);
      }

      const sessionsWithoutScores = participantSessions.filter(s => 
        s.scores.fluency === null && s.scores.content === null
      );
      if (sessionsWithoutScores.length > 0) {
        gaps.push(`${sessionsWithoutScores.length} session(s) have no AI-generated scores`);
      }

      setSessions(participantSessions);
      setDataGaps(gaps);

      // Extract unique categories
      const uniqueCategories = [...new Set(participantSessions.map(s => s.topicCategory))];
      setCategories(uniqueCategories);

    } catch (error: any) {
      console.error('Error loading participant history:', error);
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
    : sessions.filter(s => s.topicCategory === selectedCategory);

  // Calculate trend data for charts - using only real participant data
  const trendData = filteredSessions.map((session, index) => ({
    name: format(new Date(session.createdAt), 'MMM d'),
    date: session.createdAt,
    // Scores from metrics (may be null if not available)
    fluency: session.scores.fluency ?? 0,
    content: session.scores.content ?? 0,
    structure: session.scores.structure ?? 0,
    voice: session.scores.voice ?? 0,
    // Computed from actual messages
    wpm: session.metrics.wordsPerMin,
    fillers: session.metrics.fillerCount,
    words: session.metrics.totalWords,
    messages: session.metrics.messageCount,
    // Average score (only from available scores)
    avgScore: (() => {
      const scores = [
        session.scores.fluency,
        session.scores.content,
        session.scores.structure,
        session.scores.voice,
      ].filter((s): s is number => s !== null);
      return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    })(),
    sessionNum: index + 1,
    hasScores: session.scores.fluency !== null || session.scores.content !== null,
    hasMessages: session.dataSource.messagesLogged,
  }));

  // Only calculate improvement if we have enough data
  const calculateImprovement = () => {
    if (trendData.length < 2) return null;
    
    const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
    const secondHalf = trendData.slice(Math.floor(trendData.length / 2));
    
    // Helper to calculate average, handling nulls properly
    const avgMetric = (data: typeof trendData, metric: 'fluency' | 'content' | 'structure' | 'voice' | 'wpm' | 'fillers' | 'avgScore') => {
      const values = data.map(s => s[metric]).filter((v): v is number => v !== null && v > 0);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };
    
    const firstHalfHasScores = firstHalf.some(s => s.hasScores);
    const secondHalfHasScores = secondHalf.some(s => s.hasScores);
    
    return {
      fluency: firstHalfHasScores && secondHalfHasScores 
        ? Math.round(avgMetric(secondHalf, 'fluency') - avgMetric(firstHalf, 'fluency'))
        : null,
      content: firstHalfHasScores && secondHalfHasScores
        ? Math.round(avgMetric(secondHalf, 'content') - avgMetric(firstHalf, 'content'))
        : null,
      structure: firstHalfHasScores && secondHalfHasScores
        ? Math.round(avgMetric(secondHalf, 'structure') - avgMetric(firstHalf, 'structure'))
        : null,
      voice: firstHalfHasScores && secondHalfHasScores
        ? Math.round(avgMetric(secondHalf, 'voice') - avgMetric(firstHalf, 'voice'))
        : null,
      avgScore: firstHalfHasScores && secondHalfHasScores
        ? Math.round(avgMetric(secondHalf, 'avgScore') - avgMetric(firstHalf, 'avgScore'))
        : null,
      wpm: Math.round(avgMetric(secondHalf, 'wpm') - avgMetric(firstHalf, 'wpm')),
      fillers: Math.round(avgMetric(secondHalf, 'fillers') - avgMetric(firstHalf, 'fillers')),
    };
  };

  const improvement = calculateImprovement();

  // Radar chart data - only if latest session has scores
  const radarData = (() => {
    const sessionsWithScores = trendData.filter(s => s.hasScores);
    if (sessionsWithScores.length === 0) return [];
    
    const latest = sessionsWithScores[sessionsWithScores.length - 1];
    const average = {
      fluency: Math.round(sessionsWithScores.reduce((a, b) => a + b.fluency, 0) / sessionsWithScores.length),
      content: Math.round(sessionsWithScores.reduce((a, b) => a + b.content, 0) / sessionsWithScores.length),
      structure: Math.round(sessionsWithScores.reduce((a, b) => a + b.structure, 0) / sessionsWithScores.length),
      voice: Math.round(sessionsWithScores.reduce((a, b) => a + b.voice, 0) / sessionsWithScores.length),
    };

    return [
      { metric: 'Fluency', latest: latest.fluency, average: average.fluency, fullMark: 100 },
      { metric: 'Content', latest: latest.content, average: average.content, fullMark: 100 },
      { metric: 'Structure', latest: latest.structure, average: average.structure, fullMark: 100 },
      { metric: 'Voice', latest: latest.voice, average: average.voice, fullMark: 100 },
    ];
  })();

  const getTrendIcon = (value: number | null) => {
    if (value === null) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number | null, isFillers = false) => {
    if (value === null) return 'text-muted-foreground';
    if (isFillers) {
      if (value < 0) return 'text-green-500';
      if (value > 0) return 'text-destructive';
      return 'text-muted-foreground';
    }
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const formatTrendValue = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${value > 0 ? '+' : ''}${value}`;
  };

  if (isLoading) {
    return (
      <Card className="p-6 border-4 border-border">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span className="font-mono">Loading your session history...</span>
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
            Complete some practice sessions to see your personal performance over time.
          </p>
          {dataGaps.length > 0 && (
            <div className="mt-4 text-left max-w-md mx-auto">
              <p className="text-xs text-muted-foreground font-bold mb-2">Data gaps detected:</p>
              {dataGaps.map((gap, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {gap}</p>
              ))}
            </div>
          )}
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
              YOUR PERFORMANCE HISTORY
            </h2>
            <p className="text-sm text-muted-foreground font-mono">
              Individual metrics from {sessions.length} session{sessions.length !== 1 ? 's' : ''}
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

      {/* Data Gaps Warning */}
      {dataGaps.length > 0 && (
        <Card className="p-3 border-2 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-yellow-600">Data Gaps Detected</p>
              {dataGaps.map((gap, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {gap}</p>
              ))}
            </div>
          </div>
        </Card>
      )}

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
                {getTrendIcon(isFillers && value !== null ? -value : value)}
                <span className={`font-bold text-lg ${getTrendColor(value, isFillers)}`}>
                  {formatTrendValue(value)}
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
            SCORE TREND
            {trendData.some(s => !s.hasScores) && (
              <Badge variant="secondary" className="text-[9px] ml-auto">
                Some sessions lack scores
              </Badge>
            )}
          </h3>
          {trendData.some(s => s.hasScores) ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.filter(s => s.hasScores)}>
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
                  <Line type="monotone" dataKey="fluency" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Fluency" connectNulls />
                  <Line type="monotone" dataKey="content" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} name="Content" connectNulls />
                  <Line type="monotone" dataKey="structure" stroke="hsl(48, 96%, 53%)" strokeWidth={2} dot={{ r: 3 }} name="Structure" connectNulls />
                  <Line type="monotone" dataKey="voice" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={{ r: 3 }} name="Voice" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground font-mono">
                No AI-generated scores available for your sessions
              </p>
            </div>
          )}
        </Card>

        {/* Latest vs Average Radar */}
        <Card className="p-4 border-4 border-border">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            LATEST VS YOUR AVERAGE
          </h3>
          {radarData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} />
                  <Radar name="Latest" dataKey="latest" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                  <Radar name="Your Average" dataKey="average" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.2} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground font-mono">
                No scored sessions available for comparison
              </p>
            </div>
          )}
        </Card>

        {/* WPM and Fillers Trend - Always from actual messages */}
        <Card className="p-4 border-4 border-border">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            YOUR SPEAKING METRICS
            <Badge variant="outline" className="text-[9px] ml-auto">
              From your messages
            </Badge>
          </h3>
          {trendData.some(s => s.hasMessages) ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData.filter(s => s.hasMessages)}>
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
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground font-mono">
                No message data available
              </p>
            </div>
          )}
        </Card>

        {/* Session List */}
        <Card className="p-4 border-4 border-border">
          <h3 className="font-bold text-sm mb-4">YOUR SESSION DETAILS</h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {filteredSessions.slice().reverse().map((session) => {
                const scores = [
                  session.scores.fluency,
                  session.scores.content,
                  session.scores.structure,
                  session.scores.voice,
                ].filter((s): s is number => s !== null);
                
                const avgScore = scores.length > 0 
                  ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                  : null;

                return (
                  <div key={session.sessionId} className="p-3 border-2 border-border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{session.topic}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">
                            {session.topicCategory}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(session.createdAt), 'MMM d, yyyy')}
                          </span>
                          {!session.dataSource.messagesLogged && (
                            <Badge variant="outline" className="text-[9px] text-yellow-600">
                              No messages
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          {avgScore !== null ? `${avgScore}%` : 'N/A'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {session.metrics.wordsPerMin > 0 
                            ? `${session.metrics.wordsPerMin} WPM`
                            : 'No WPM data'}
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
