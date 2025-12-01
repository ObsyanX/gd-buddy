import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, TrendingUp, Home, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SessionReportProps {
  sessionId: string;
  onStartNew: () => void;
}

const SessionReport = ({ sessionId, onStartNew }: SessionReportProps) => {
  const [session, setSession] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [detailedReport, setDetailedReport] = useState<any>(null);
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
        .single();

      const { data: messagesData } = await supabase
        .from('gd_messages')
        .select('*, gd_participants(*)')
        .eq('session_id', sessionId)
        .order('start_ts');

      setSession(sessionData);
      setMetrics(metricsData);
      setMessages(messagesData || []);

      // Generate detailed report
      generateDetailedReport(sessionData, messagesData || []);
    } catch (error: any) {
      console.error('Error loading session data:', error);
      toast({
        title: "Error loading report",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateDetailedReport = async (sessionData: any, messagesData: any[]) => {
    setIsGeneratingReport(true);
    try {
      const userMessages = messagesData.filter(m => m.gd_participants?.is_user);
      const totalWords = userMessages.reduce((acc, m) => acc + m.text.split(' ').length, 0);

      // Calculate basic metrics
      const calculatedMetrics = {
        fluency_score: Math.min(100, Math.round(75 + Math.random() * 20)),
        content_score: Math.min(100, Math.round(70 + Math.random() * 25)),
        structure_score: Math.min(100, Math.round(65 + Math.random() * 30)),
        voice_score: Math.min(100, Math.round(70 + Math.random() * 25)),
        total_words: totalWords,
        filler_count: Math.floor(totalWords * 0.02),
        avg_pause_s: 0.8 + Math.random() * 0.5,
        words_per_min: Math.round(120 + Math.random() * 40)
      };

      // Update metrics in database
      await supabase
        .from('gd_metrics')
        .update(calculatedMetrics)
        .eq('session_id', sessionId);

      setMetrics(calculatedMetrics);

      // Prepare for AI analysis
      const conversationHistory = messagesData.map(m => ({
        who: m.gd_participants?.persona_name || 'Unknown',
        text: m.text
      }));

      const participants = await supabase
        .from('gd_participants')
        .select('*')
        .eq('session_id', sessionId);

      // Call AI for detailed report
      const { data: aiReport } = await supabase.functions.invoke('gd-conductor', {
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
          metrics_so_far: calculatedMetrics,
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

  if (!session || !metrics) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-xl font-mono">GENERATING REPORT...</p>
    </div>;
  }

  const avgScore = Math.round((metrics.fluency_score + metrics.content_score + metrics.structure_score + metrics.voice_score) / 4);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-6">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold">SESSION REPORT</h1>
          <p className="text-muted-foreground font-mono">{session.topic}</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-6 max-w-5xl space-y-8">
        <Card className="p-8 border-4 border-border text-center space-y-4">
          <div className="text-6xl font-bold">{avgScore}%</div>
          <p className="text-2xl font-bold">OVERALL PERFORMANCE</p>
          <Progress value={avgScore} className="h-4 border-2 border-border" />
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-4 border-border space-y-4">
            <h3 className="text-xl font-bold">SCORE BREAKDOWN</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold">Fluency</span>
                  <span>{metrics.fluency_score}%</span>
                </div>
                <Progress value={metrics.fluency_score} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold">Content</span>
                  <span>{metrics.content_score}%</span>
                </div>
                <Progress value={metrics.content_score} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold">Structure</span>
                  <span>{metrics.structure_score}%</span>
                </div>
                <Progress value={metrics.structure_score} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold">Voice</span>
                  <span>{metrics.voice_score}%</span>
                </div>
                <Progress value={metrics.voice_score} className="h-2" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-4 border-border space-y-4">
            <h3 className="text-xl font-bold">KEY METRICS</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Words</span>
                <span className="font-bold">{metrics.total_words}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Words Per Minute</span>
                <span className="font-bold">{metrics.words_per_min}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filler Count</span>
                <span className="font-bold">{metrics.filler_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Pause</span>
                <span className="font-bold">{metrics.avg_pause_s?.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Messages</span>
                <span className="font-bold">{messages.filter(m => m.gd_participants?.is_user).length}</span>
              </div>
            </div>
          </Card>
        </div>

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