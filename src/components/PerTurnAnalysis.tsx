import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, TrendingUp, ArrowRight } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';

interface TurnAnalysis {
  turnIndex: number;
  speaker: string;
  isUser: boolean;
  text: string;
  wordCount: number;
  intent: string | null;
  timestamp: string;
  fillerCount: number;
  hasEvidence: boolean;
  hasStructure: boolean;
}

interface PerTurnAnalysisProps {
  messages: any[];
  currentParticipantId?: string;
  calculatedStats: any;
}

const FILLER_WORDS = ['um', 'uh', 'uhh', 'umm', 'er', 'ah', 'like', 'you know', 'basically', 'actually', 'literally', 'so', 'well', 'i mean', 'kind of', 'sort of'];

function analyzeTurns(messages: any[], currentParticipantId?: string): TurnAnalysis[] {
  return messages.map((m, i) => {
    const text = m.text || '';
    const lower = text.toLowerCase();
    const words = text.trim().split(/\s+/).filter(Boolean);
    
    let fillerCount = 0;
    FILLER_WORDS.forEach(f => {
      const regex = new RegExp(`\\b${f}\\b`, 'gi');
      const matches = lower.match(regex);
      fillerCount += matches ? matches.length : 0;
    });

    const hasEvidence = /because|evidence|research|data|studies|for example|such as|according to/i.test(text);
    const hasStructure = /first|second|third|finally|moreover|however|therefore|in conclusion/i.test(text);
    
    const isUser = currentParticipantId 
      ? m.participant_id === currentParticipantId 
      : m.gd_participants?.is_user;

    return {
      turnIndex: i + 1,
      speaker: m.gd_participants?.persona_name || 'Unknown',
      isUser,
      text,
      wordCount: words.length,
      intent: m.intent,
      timestamp: m.start_ts,
      fillerCount,
      hasEvidence,
      hasStructure,
    };
  });
}

const IntentBadge = ({ intent }: { intent: string | null }) => {
  if (!intent) return null;
  const colorMap: Record<string, string> = {
    agree: 'default',
    elaborate: 'secondary',
    contradict: 'destructive',
    ask_question: 'outline',
    summarize: 'default',
    counterpoint: 'destructive',
    example: 'secondary',
    clarify: 'outline',
  };
  return (
    <Badge variant={(colorMap[intent] as any) || 'outline'} className="text-[10px]">
      {intent.replace('_', ' ')}
    </Badge>
  );
};

const PerTurnAnalysis = ({ messages, currentParticipantId, calculatedStats }: PerTurnAnalysisProps) => {
  const turns = analyzeTurns(messages, currentParticipantId);
  const userTurns = turns.filter(t => t.isUser);

  // Comparative radar: user vs platform average (simulated benchmarks)
  const radarData = [
    { metric: 'Fluency', user: calculatedStats?.fluency_score || 0, benchmark: 72 },
    { metric: 'Content', user: calculatedStats?.content_score || 0, benchmark: 68 },
    { metric: 'Structure', user: calculatedStats?.structure_score || 0, benchmark: 65 },
    { metric: 'Voice', user: calculatedStats?.voice_score || 0, benchmark: 70 },
    { metric: 'Participation', user: Math.round((calculatedStats?.participationRate || 0) * 100), benchmark: 25 },
    { metric: 'Vocabulary', user: Math.min(100, Math.round((calculatedStats?.uniqueWords || 0) / 2)), benchmark: 50 },
  ];

  if (userTurns.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Comparative Radar Chart */}
      <Card className="p-6 border-4 border-border space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          YOU vs PLATFORM AVERAGE
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Radar name="You" dataKey="user" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              <Radar name="Platform Avg" dataKey="benchmark" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.15} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Per-Turn Argument Timeline */}
      <Card className="p-6 border-4 border-border space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          ARGUMENT TIMELINE
        </h3>
        <p className="text-sm text-muted-foreground">
          Per-turn breakdown of your contributions with quality indicators.
        </p>
        <div className="space-y-3">
          {userTurns.map((turn, i) => {
            const qualityScore = 
              (turn.hasEvidence ? 1 : 0) + 
              (turn.hasStructure ? 1 : 0) + 
              (turn.fillerCount === 0 ? 1 : 0) + 
              (turn.wordCount >= 20 && turn.wordCount <= 80 ? 1 : 0);
            
            const qualityColor = qualityScore >= 3 
              ? 'border-l-green-500' 
              : qualityScore >= 2 
                ? 'border-l-yellow-500' 
                : 'border-l-red-500';

            return (
              <div 
                key={turn.turnIndex} 
                className={`p-3 border-2 border-border rounded ${qualityColor} border-l-4`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">Turn {turn.turnIndex}</span>
                    <IntentBadge intent={turn.intent} />
                    {turn.hasEvidence && (
                      <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-600">Evidence</Badge>
                    )}
                    {turn.hasStructure && (
                      <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-600">Structured</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{turn.wordCount} words</span>
                    {turn.fillerCount > 0 && (
                      <Badge variant="destructive" className="text-[10px]">{turn.fillerCount} fillers</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed line-clamp-2">{turn.text}</p>
                {i < userTurns.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="pt-3 border-t border-border">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-green-500/30 border border-green-500" /> Strong (3-4 indicators)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-yellow-500/30 border border-yellow-500" /> Moderate (2 indicators)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500" /> Weak (0-1 indicators)
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PerTurnAnalysis;
