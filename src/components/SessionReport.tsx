import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, TrendingUp, Home, Target, Clock, MessageSquare, Mic, Eye, User, Camera, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/supabase-auth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';

interface SessionReportProps {
  sessionId: string;
  onStartNew: () => void;
}

// Industry benchmarks for professional speaking
const BENCHMARKS = {
  wpm: { ideal: 150, min: 120, max: 180, label: "Words Per Minute" },
  fillerRate: { ideal: 0.01, max: 0.03, label: "Filler Word Rate" }, // fillers per word
  avgResponseLength: { ideal: 60, min: 40, max: 100, label: "Avg Words Per Response" },
  participationRate: { ideal: 0.25, min: 0.15, max: 0.35, label: "Participation Rate" }, // in group discussion
  responseTime: { ideal: 2, max: 5, label: "Avg Response Time (s)" },
};

// Common filler words to detect
const FILLER_WORDS = [
  'um', 'uh', 'uhh', 'umm', 'er', 'ah', 'like', 'you know', 'basically', 
  'actually', 'literally', 'so', 'well', 'i mean', 'kind of', 'sort of',
  'right', 'okay', 'yeah'
];

const SessionReport = ({ sessionId, onStartNew }: SessionReportProps) => {
  const [session, setSession] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [detailedReport, setDetailedReport] = useState<any>(null);
  const [calculatedStats, setCalculatedStats] = useState<any>(null);
  const [videoMetrics, setVideoMetrics] = useState<any>(null);
  const [chartData, setChartData] = useState<{
    timeline: any[];
    performance: any[];
    fillersByType: any[];
    comparison: any[];
  }>({ timeline: [], performance: [], fillersByType: [], comparison: [] });
  const { toast } = useToast();

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      const { data: sessionData } = await supabase
        .from('gd_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      const { data: metricsData } = await supabase
        .from('gd_metrics')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      const { data: messagesData } = await supabase
        .from('gd_messages')
        .select('*, gd_participants(*)')
        .eq('session_id', sessionId)
        .order('start_ts');

      setSession(sessionData);
      setMessages(messagesData || []);

      // Load video metrics if available
      if (metricsData?.posture_score || metricsData?.eye_contact_score) {
        setVideoMetrics({
          postureScore: metricsData.posture_score,
          eyeContactScore: metricsData.eye_contact_score,
          expressionScore: metricsData.expression_score,
          tips: metricsData.video_tips || []
        });
      }

      // Calculate real metrics from session data
      const realMetrics = calculateRealMetrics(sessionData, messagesData || []);
      setCalculatedStats(realMetrics);
      
      // Generate chart data
      generateChartData(messagesData || [], realMetrics, metricsData);
      
      // Generate detailed report with real data
      generateDetailedReport(sessionData, messagesData || [], realMetrics);
    } catch (error: any) {
      console.error('Error loading session data:', error);
      toast({
        title: "Error loading report",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateRealMetrics = (sessionData: any, messagesData: any[]) => {
    const userMessages = messagesData.filter(m => m.gd_participants?.is_user);
    const aiMessages = messagesData.filter(m => !m.gd_participants?.is_user);
    const totalMessages = messagesData.length;
    
    // Calculate total words spoken by user
    const totalUserWords = userMessages.reduce((acc, m) => {
      const words = m.text?.trim().split(/\s+/).filter(Boolean) || [];
      return acc + words.length;
    }, 0);

    // Calculate session duration in minutes
    let sessionDurationMinutes = 5; // default
    if (sessionData.start_time && sessionData.end_time) {
      const start = new Date(sessionData.start_time).getTime();
      const end = new Date(sessionData.end_time).getTime();
      sessionDurationMinutes = Math.max(1, (end - start) / (1000 * 60));
    } else if (messagesData.length > 1) {
      // Estimate from message timestamps
      const firstMsg = new Date(messagesData[0]?.start_ts).getTime();
      const lastMsg = new Date(messagesData[messagesData.length - 1]?.start_ts).getTime();
      sessionDurationMinutes = Math.max(1, (lastMsg - firstMsg) / (1000 * 60));
    }

    // Calculate actual WPM
    const actualWpm = Math.round(totalUserWords / sessionDurationMinutes);

    // Count actual filler words
    const allUserText = userMessages.map(m => m.text?.toLowerCase() || '').join(' ');
    let fillerCount = 0;
    FILLER_WORDS.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = allUserText.match(regex);
      fillerCount += matches ? matches.length : 0;
    });
    const fillerRate = totalUserWords > 0 ? fillerCount / totalUserWords : 0;

    // Calculate average response length
    const avgResponseLength = userMessages.length > 0 
      ? Math.round(totalUserWords / userMessages.length) 
      : 0;

    // Calculate participation rate
    const participationRate = totalMessages > 0 
      ? userMessages.length / totalMessages 
      : 0;

    // Calculate response times (time between AI message and user response)
    const responseTimes: number[] = [];
    for (let i = 1; i < messagesData.length; i++) {
      const current = messagesData[i];
      const previous = messagesData[i - 1];
      if (current.gd_participants?.is_user && !previous.gd_participants?.is_user) {
        const prevTime = new Date(previous.end_ts || previous.start_ts).getTime();
        const currTime = new Date(current.start_ts).getTime();
        const responseTime = (currTime - prevTime) / 1000;
        if (responseTime > 0 && responseTime < 60) {
          responseTimes.push(responseTime);
        }
      }
    }
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // Calculate scores based on benchmarks (0-100)
    const fluencyScore = calculateScore('wpm', actualWpm);
    const contentScore = calculateContentScore(userMessages);
    const structureScore = calculateStructureScore(userMessages, avgResponseLength);
    const voiceScore = calculateVoiceScore(fillerRate, actualWpm);

    const calculatedMetrics = {
      fluency_score: fluencyScore,
      content_score: contentScore,
      structure_score: structureScore,
      voice_score: voiceScore,
      total_words: totalUserWords,
      filler_count: fillerCount,
      avg_pause_s: avgResponseTime,
      words_per_min: actualWpm
    };

    // Update metrics in database
    supabase
      .from('gd_metrics')
      .upsert({ 
        session_id: sessionId,
        ...calculatedMetrics,
        updated_at: new Date().toISOString()
      })
      .then(() => console.log('Metrics saved'));

    setMetrics(calculatedMetrics);

    return {
      ...calculatedMetrics,
      sessionDurationMinutes,
      userMessageCount: userMessages.length,
      totalMessageCount: totalMessages,
      participationRate,
      avgResponseLength,
      avgResponseTime,
      fillerRate,
      uniqueWords: new Set(allUserText.split(/\s+/).filter(Boolean)).size,
    };
  };

  const calculateScore = (metric: string, value: number): number => {
    const benchmark = BENCHMARKS[metric as keyof typeof BENCHMARKS];
    if (!benchmark) return 70;

    if ('ideal' in benchmark && 'min' in benchmark && 'max' in benchmark) {
      const { ideal, min, max } = benchmark as { ideal: number; min: number; max: number };
      if (value >= min && value <= max) {
        // Within range - calculate how close to ideal
        const distanceFromIdeal = Math.abs(value - ideal);
        const maxDistance = Math.max(ideal - min, max - ideal);
        return Math.round(100 - (distanceFromIdeal / maxDistance) * 20);
      } else if (value < min) {
        return Math.max(40, Math.round(60 - (min - value) / min * 40));
      } else {
        return Math.max(50, Math.round(70 - (value - max) / max * 30));
      }
    }
    return 70;
  };

  const calculateContentScore = (userMessages: any[]): number => {
    if (userMessages.length === 0) return 50;

    let score = 60; // base score
    const allText = userMessages.map(m => m.text?.toLowerCase() || '').join(' ');
    
    // Check for substantive content indicators
    const contentIndicators = [
      { pattern: /because|therefore|however|although|furthermore/gi, points: 5 },
      { pattern: /for example|such as|specifically|in particular/gi, points: 5 },
      { pattern: /i think|i believe|in my opinion|my perspective/gi, points: 3 },
      { pattern: /data|research|studies|evidence|statistics/gi, points: 5 },
      { pattern: /firstly|secondly|finally|in conclusion/gi, points: 4 },
      { pattern: /agree|disagree|point|argument|perspective/gi, points: 3 },
    ];

    contentIndicators.forEach(({ pattern, points }) => {
      const matches = allText.match(pattern);
      if (matches) {
        score += Math.min(points * matches.length, points * 3);
      }
    });

    // Penalize very short responses
    const avgLength = allText.length / userMessages.length;
    if (avgLength < 50) score -= 15;
    else if (avgLength < 100) score -= 5;

    return Math.min(100, Math.max(30, score));
  };

  const calculateStructureScore = (userMessages: any[], avgResponseLength: number): number => {
    if (userMessages.length === 0) return 50;

    let score = 60;
    
    // Good response length
    if (avgResponseLength >= BENCHMARKS.avgResponseLength.min && 
        avgResponseLength <= BENCHMARKS.avgResponseLength.max) {
      score += 15;
    } else if (avgResponseLength > BENCHMARKS.avgResponseLength.max) {
      score -= 10; // Too verbose
    } else {
      score -= 15; // Too brief
    }

    // Consistency in response lengths
    const lengths = userMessages.map(m => m.text?.split(/\s+/).length || 0);
    const variance = lengths.length > 1 
      ? lengths.reduce((acc, len) => acc + Math.pow(len - avgResponseLength, 2), 0) / lengths.length 
      : 0;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 20) score += 10; // Consistent
    else if (stdDev > 50) score -= 10; // Inconsistent

    // Check for structured responses
    const allText = userMessages.map(m => m.text || '').join(' ');
    if (/first|second|third|finally|in conclusion/i.test(allText)) score += 10;

    return Math.min(100, Math.max(30, score));
  };

  const calculateVoiceScore = (fillerRate: number, wpm: number): number => {
    let score = 70;

    // Filler word penalty
    if (fillerRate <= BENCHMARKS.fillerRate.ideal) {
      score += 20;
    } else if (fillerRate <= BENCHMARKS.fillerRate.max) {
      score += 10;
    } else {
      score -= Math.min(30, Math.round(fillerRate * 500));
    }

    // WPM score component
    if (wpm >= BENCHMARKS.wpm.min && wpm <= BENCHMARKS.wpm.max) {
      score += 10;
    } else if (wpm < 100 || wpm > 200) {
      score -= 15;
    }

    return Math.min(100, Math.max(30, score));
  };

  const generateChartData = (messagesData: any[], realMetrics: any, metricsData: any) => {
    // Timeline data - message distribution over time
    const userMessages = messagesData.filter(m => m.gd_participants?.is_user);
    const aiMessages = messagesData.filter(m => !m.gd_participants?.is_user);
    
    // Create timeline buckets
    const timelineData: any[] = [];
    if (messagesData.length > 1) {
      const firstTime = new Date(messagesData[0]?.start_ts).getTime();
      const lastTime = new Date(messagesData[messagesData.length - 1]?.start_ts).getTime();
      const duration = lastTime - firstTime;
      const bucketCount = Math.min(10, messagesData.length);
      const bucketSize = duration / bucketCount;
      
      for (let i = 0; i < bucketCount; i++) {
        const bucketStart = firstTime + (i * bucketSize);
        const bucketEnd = bucketStart + bucketSize;
        
        const userMsgs = userMessages.filter(m => {
          const t = new Date(m.start_ts).getTime();
          return t >= bucketStart && t < bucketEnd;
        });
        const aiMsgs = aiMessages.filter(m => {
          const t = new Date(m.start_ts).getTime();
          return t >= bucketStart && t < bucketEnd;
        });
        
        const userWords = userMsgs.reduce((acc, m) => acc + (m.text?.split(/\s+/).length || 0), 0);
        const aiWords = aiMsgs.reduce((acc, m) => acc + (m.text?.split(/\s+/).length || 0), 0);
        
        timelineData.push({
          time: `${i + 1}`,
          userWords,
          aiWords,
          userMessages: userMsgs.length,
          aiMessages: aiMsgs.length,
        });
      }
    }

    // Performance radar data
    const performanceData = [
      { metric: 'Fluency', score: realMetrics.fluency_score || 0, fullMark: 100 },
      { metric: 'Content', score: realMetrics.content_score || 0, fullMark: 100 },
      { metric: 'Structure', score: realMetrics.structure_score || 0, fullMark: 100 },
      { metric: 'Voice', score: realMetrics.voice_score || 0, fullMark: 100 },
      { metric: 'Posture', score: metricsData?.posture_score || 0, fullMark: 100 },
      { metric: 'Eye Contact', score: metricsData?.eye_contact_score || 0, fullMark: 100 },
    ];

    // Filler words by type
    const allUserText = userMessages.map(m => m.text?.toLowerCase() || '').join(' ');
    const fillersByType: any[] = [];
    FILLER_WORDS.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = allUserText.match(regex);
      if (matches && matches.length > 0) {
        fillersByType.push({ word: filler, count: matches.length });
      }
    });
    fillersByType.sort((a, b) => b.count - a.count);

    // Benchmark comparison data
    const comparisonData = [
      { 
        metric: 'WPM', 
        yours: realMetrics.words_per_min || 0, 
        ideal: BENCHMARKS.wpm.ideal,
        min: BENCHMARKS.wpm.min,
        max: BENCHMARKS.wpm.max 
      },
      { 
        metric: 'Words/Response', 
        yours: realMetrics.avgResponseLength || 0, 
        ideal: BENCHMARKS.avgResponseLength.ideal,
        min: BENCHMARKS.avgResponseLength.min,
        max: BENCHMARKS.avgResponseLength.max 
      },
      { 
        metric: 'Response Time (s)', 
        yours: realMetrics.avgResponseTime || 0, 
        ideal: BENCHMARKS.responseTime.ideal,
        max: BENCHMARKS.responseTime.max 
      },
    ];

    setChartData({
      timeline: timelineData,
      performance: performanceData,
      fillersByType: fillersByType.slice(0, 8),
      comparison: comparisonData,
    });
  };

  const generateDetailedReport = async (sessionData: any, messagesData: any[], realMetrics: any) => {
    setIsGeneratingReport(true);
    try {
      const conversationHistory = messagesData.map(m => ({
        who: m.gd_participants?.persona_name || 'Unknown',
        is_user: m.gd_participants?.is_user || false,
        text: m.text
      }));

      const participants = await supabase
        .from('gd_participants')
        .select('*')
        .eq('session_id', sessionId);

      const { data: aiReport } = await invokeWithAuth('gd-conductor', {
        body: {
          session_id: sessionId,
          topic: sessionData.topic,
          participants: participants.data?.map((p: any) => ({
            id: p.id,
            is_user: p.is_user,
            persona: {
              name: p.persona_name,
              role: p.persona_role,
              tone: p.persona_tone
            }
          })) || [],
          conversation_history: conversationHistory,
          metrics_so_far: realMetrics,
          benchmarks: BENCHMARKS,
          request: 'post_session_report'
        }
      });

      if (aiReport) {
        setDetailedReport(aiReport);
      }
    } catch (error: any) {
      console.error('Error generating detailed report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getBenchmarkComparison = (metric: string, value: number): { status: 'excellent' | 'good' | 'needs-work'; label: string } => {
    const benchmark = BENCHMARKS[metric as keyof typeof BENCHMARKS];
    if (!benchmark) return { status: 'good', label: 'Good' };

    if ('ideal' in benchmark && 'min' in benchmark && 'max' in benchmark) {
      const { ideal, min, max } = benchmark as { ideal: number; min: number; max: number };
      const tolerance = (max - min) * 0.1;
      if (Math.abs(value - ideal) <= tolerance) return { status: 'excellent', label: 'Excellent' };
      if (value >= min && value <= max) return { status: 'good', label: 'Good' };
      return { status: 'needs-work', label: 'Needs Work' };
    }
    return { status: 'good', label: 'Good' };
  };

  if (!session || !metrics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse text-4xl">📊</div>
          <p className="text-xl font-mono">ANALYZING SESSION DATA...</p>
          <p className="text-sm text-muted-foreground">Calculating real metrics from your performance</p>
        </div>
      </div>
    );
  }

  const avgScore = Math.round((metrics.fluency_score + metrics.content_score + metrics.structure_score + metrics.voice_score) / 4);
  const wpmStatus = getBenchmarkComparison('wpm', metrics.words_per_min);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-6">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold">SESSION REPORT</h1>
          <p className="text-muted-foreground font-mono">{session.topic}</p>
          {calculatedStats && (
            <p className="text-sm text-muted-foreground mt-1">
              Duration: {calculatedStats.sessionDurationMinutes.toFixed(1)} min • {calculatedStats.userMessageCount} contributions
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto py-8 px-6 max-w-5xl space-y-8">
        {/* Overall Score */}
        <Card className="p-8 border-4 border-border text-center space-y-4">
          <div className="text-6xl font-bold">{avgScore}%</div>
          <p className="text-2xl font-bold">OVERALL PERFORMANCE</p>
          <Progress value={avgScore} className="h-4 border-2 border-border" />
          <p className="text-sm text-muted-foreground">
            Based on fluency, content quality, structure, and delivery analysis
          </p>
        </Card>

        {/* Score Breakdown & Key Metrics */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-4 border-border space-y-4">
            <h3 className="text-xl font-bold">SCORE BREAKDOWN</h3>
            <div className="space-y-4">
              {[
                { label: 'Fluency', score: metrics.fluency_score, desc: 'Speaking pace & flow' },
                { label: 'Content', score: metrics.content_score, desc: 'Substance & relevance' },
                { label: 'Structure', score: metrics.structure_score, desc: 'Organization & clarity' },
                { label: 'Voice', score: metrics.voice_score, desc: 'Delivery & filler usage' },
              ].map(({ label, score, desc }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <div>
                      <span className="font-bold">{label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">({desc})</span>
                    </div>
                    <span className="font-mono">{score}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 border-4 border-border space-y-4">
            <h3 className="text-xl font-bold">KEY METRICS</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Words Per Minute
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono">{metrics.words_per_min}</span>
                  <Badge variant={wpmStatus.status === 'excellent' ? 'default' : wpmStatus.status === 'good' ? 'secondary' : 'destructive'} className="text-xs">
                    {wpmStatus.label}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Benchmark: {BENCHMARKS.wpm.min}-{BENCHMARKS.wpm.max} WPM (ideal: {BENCHMARKS.wpm.ideal})
              </p>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Total Words
                </span>
                <span className="font-bold font-mono">{metrics.total_words}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Filler Words
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono">{metrics.filler_count}</span>
                  {calculatedStats && (
                    <span className="text-xs text-muted-foreground">
                      ({(calculatedStats.fillerRate * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Target: &lt;{(BENCHMARKS.fillerRate.max * 100).toFixed(0)}% of words
              </p>

              <div className="flex justify-between items-center pt-2">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Avg Response Time
                </span>
                <span className="font-bold font-mono">{metrics.avg_pause_s?.toFixed(1)}s</span>
              </div>

              {calculatedStats && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg Words/Response</span>
                    <span className="font-bold font-mono">{calculatedStats.avgResponseLength}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Participation Rate</span>
                    <span className="font-bold font-mono">{(calculatedStats.participationRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Vocabulary Diversity</span>
                    <span className="font-bold font-mono">{calculatedStats.uniqueWords} unique words</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Video Metrics Section */}
        {videoMetrics && (
          <Card className="p-6 border-4 border-border space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Camera className="w-6 h-6" />
              VIDEO ANALYSIS
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Posture
                  </span>
                  <span className="font-bold font-mono">{videoMetrics.postureScore}%</span>
                </div>
                <Progress value={videoMetrics.postureScore} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Body positioning and steadiness
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Eye Contact
                  </span>
                  <span className="font-bold font-mono">{videoMetrics.eyeContactScore}%</span>
                </div>
                <Progress value={videoMetrics.eyeContactScore} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Looking at the camera/audience
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Expression
                  </span>
                  <span className="font-bold font-mono">{videoMetrics.expressionScore}%</span>
                </div>
                <Progress value={videoMetrics.expressionScore} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Confidence and composure
                </p>
              </div>
            </div>

            {videoMetrics.tips && videoMetrics.tips.length > 0 && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-bold mb-2">Video Tips:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {videoMetrics.tips.slice(0, 5).map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Performance Charts Section */}
        <Card className="p-6 border-4 border-border space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            PERFORMANCE ANALYTICS
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Performance Radar */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm">Overall Performance</h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData.performance}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="metric" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Filler Words Chart */}
            {chartData.fillersByType.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-sm">Filler Words Breakdown</h4>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.fillersByType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis 
                        dataKey="word" 
                        type="category" 
                        width={60}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '2px solid hsl(var(--border))',
                          borderRadius: '4px'
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Chart */}
          {chartData.timeline.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-border">
              <h4 className="font-bold text-sm">Discussion Timeline (Words Over Time)</h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      label={{ value: 'Time Period', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '2px solid hsl(var(--border))',
                        borderRadius: '4px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="userWords" 
                      name="Your Words"
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="aiWords" 
                      name="AI Words"
                      stroke="hsl(var(--muted-foreground))" 
                      fill="hsl(var(--muted-foreground))"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Benchmark Comparison Chart */}
          <div className="space-y-2 pt-4 border-t border-border">
            <h4 className="font-bold text-sm">Your Metrics vs Professional Benchmarks</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.comparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis 
                    dataKey="metric" 
                    type="category"
                    width={100}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '2px solid hsl(var(--border))',
                      borderRadius: '4px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="yours" name="Your Score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="ideal" name="Ideal" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Benchmark Comparison */}
        <Card className="p-6 border-4 border-border space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            BENCHMARK COMPARISON
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border-2 border-border rounded">
              <div className="text-2xl font-bold">{metrics.words_per_min}</div>
              <div className="text-sm text-muted-foreground">Your WPM</div>
              <div className="text-xs mt-2 p-2 bg-muted rounded">
                Professional range: {BENCHMARKS.wpm.min}-{BENCHMARKS.wpm.max}
              </div>
            </div>
            <div className="p-4 border-2 border-border rounded">
              <div className="text-2xl font-bold">{calculatedStats?.avgResponseLength || 0}</div>
              <div className="text-sm text-muted-foreground">Words/Response</div>
              <div className="text-xs mt-2 p-2 bg-muted rounded">
                Target: {BENCHMARKS.avgResponseLength.min}-{BENCHMARKS.avgResponseLength.max}
              </div>
            </div>
            <div className="p-4 border-2 border-border rounded">
              <div className="text-2xl font-bold">
                {calculatedStats ? (calculatedStats.fillerRate * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Filler Rate</div>
              <div className="text-xs mt-2 p-2 bg-muted rounded">
                Target: &lt;{(BENCHMARKS.fillerRate.max * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </Card>

        {/* AI-generated sections */}
        {isGeneratingReport && (
          <Card className="p-6 border-4 border-border">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <span>Generating detailed AI analysis...</span>
            </div>
          </Card>
        )}

        {detailedReport?.strengths && (
          <Card className="p-6 border-4 border-border space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              STRENGTHS
            </h3>
            <ul className="space-y-2">
              {detailedReport.strengths.map((strength: string, i: number) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-green-600">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {detailedReport?.weaknesses && (
          <Card className="p-6 border-4 border-border space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <XCircle className="w-6 h-6 text-destructive" />
              AREAS FOR IMPROVEMENT
            </h3>
            <ul className="space-y-2">
              {detailedReport.weaknesses.map((weakness: string, i: number) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-destructive">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {detailedReport?.drills && (
          <Card className="p-6 border-4 border-border space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              IMPROVEMENT DRILLS
            </h3>
            <div className="space-y-3">
              {detailedReport.drills.map((drill: any, i: number) => (
                <div key={i} className="p-4 border-2 border-border space-y-2">
                  <h4 className="font-bold">{drill.title || `Drill ${i + 1}`}</h4>
                  <p className="text-sm text-muted-foreground">{drill.description}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            variant="outline"
            onClick={onStartNew}
            className="border-4 border-border"
          >
            <Home className="w-4 h-4 mr-2" />
            HOME
          </Button>
          <Button
            size="lg"
            onClick={onStartNew}
            className="border-4 border-border shadow-md"
          >
            START NEW SESSION
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SessionReport;
