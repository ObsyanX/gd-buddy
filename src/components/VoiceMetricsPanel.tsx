import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, Volume2, AlertTriangle, TrendingUp, Timer } from 'lucide-react';

// Common filler words to detect
const FILLER_WORDS = [
  'um', 'uh', 'uhh', 'umm', 'er', 'ah', 'like', 'you know', 'basically',
  'actually', 'literally', 'so', 'well', 'i mean', 'kind of', 'sort of',
  'right', 'okay', 'yeah'
];

interface VoiceMetricsPanelProps {
  isUserSpeaking: boolean;
  currentTranscript: string;
  sessionStartTime?: number;
  isMinimized?: boolean;
  onMinimizeToggle?: () => void;
}

export interface VoiceSessionMetrics {
  totalWords: number;
  fillerCount: number;
  fillerRate: number;
  estimatedWpm: number;
  speakingTimeSeconds: number;
  fillersByType: Record<string, number>;
}

const VoiceMetricsPanel = ({ 
  isUserSpeaking, 
  currentTranscript,
  sessionStartTime,
  isMinimized = false,
  onMinimizeToggle
}: VoiceMetricsPanelProps) => {
  const [metrics, setMetrics] = useState<VoiceSessionMetrics>({
    totalWords: 0,
    fillerCount: 0,
    fillerRate: 0,
    estimatedWpm: 0,
    speakingTimeSeconds: 0,
    fillersByType: {},
  });
  
  const allTranscriptsRef = useRef<string[]>([]);
  const speakingStartRef = useRef<number | null>(null);
  const totalSpeakingTimeRef = useRef(0);
  const lastProcessedRef = useRef('');

  // Process new transcript text
  const processTranscript = useCallback((text: string) => {
    if (!text || text === lastProcessedRef.current) return;
    
    const newText = text.replace(lastProcessedRef.current, '').trim();
    if (!newText) return;
    
    lastProcessedRef.current = text;
    allTranscriptsRef.current.push(newText);
    
    // Analyze all accumulated text
    const allText = allTranscriptsRef.current.join(' ').toLowerCase();
    const words = allText.split(/\s+/).filter(Boolean);
    const totalWords = words.length;
    
    // Count filler words by type
    const fillersByType: Record<string, number> = {};
    let fillerCount = 0;
    
    FILLER_WORDS.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = allText.match(regex);
      if (matches) {
        fillersByType[filler] = matches.length;
        fillerCount += matches.length;
      }
    });
    
    // Calculate speaking time
    const now = Date.now();
    if (isUserSpeaking && speakingStartRef.current) {
      totalSpeakingTimeRef.current += (now - speakingStartRef.current) / 1000;
      speakingStartRef.current = now;
    }
    
    const speakingTimeSeconds = totalSpeakingTimeRef.current;
    const speakingTimeMinutes = speakingTimeSeconds / 60;
    
    // Calculate WPM
    const estimatedWpm = speakingTimeMinutes > 0.1 
      ? Math.round(totalWords / speakingTimeMinutes)
      : 0;
    
    // Calculate filler rate
    const fillerRate = totalWords > 0 ? fillerCount / totalWords : 0;
    
    setMetrics({
      totalWords,
      fillerCount,
      fillerRate,
      estimatedWpm,
      speakingTimeSeconds,
      fillersByType,
    });
  }, [isUserSpeaking]);

  // Track speaking time
  useEffect(() => {
    if (isUserSpeaking) {
      if (!speakingStartRef.current) {
        speakingStartRef.current = Date.now();
      }
    } else {
      if (speakingStartRef.current) {
        totalSpeakingTimeRef.current += (Date.now() - speakingStartRef.current) / 1000;
        speakingStartRef.current = null;
      }
    }
  }, [isUserSpeaking]);

  // Process transcript changes
  useEffect(() => {
    if (currentTranscript) {
      processTranscript(currentTranscript);
    }
  }, [currentTranscript, processTranscript]);

  // Update speaking time display periodically
  useEffect(() => {
    if (!isUserSpeaking) return;
    
    const interval = setInterval(() => {
      if (speakingStartRef.current) {
        const currentSpeaking = totalSpeakingTimeRef.current + 
          (Date.now() - speakingStartRef.current) / 1000;
        setMetrics(prev => ({
          ...prev,
          speakingTimeSeconds: currentSpeaking,
          estimatedWpm: currentSpeaking > 6 
            ? Math.round(prev.totalWords / (currentSpeaking / 60))
            : prev.estimatedWpm
        }));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isUserSpeaking]);

  const getWpmStatus = (wpm: number) => {
    if (wpm === 0) return { color: 'text-muted-foreground', label: 'N/A' };
    if (wpm >= 120 && wpm <= 180) return { color: 'text-green-500', label: 'Optimal' };
    if (wpm >= 100 && wpm <= 200) return { color: 'text-yellow-500', label: 'Good' };
    return { color: 'text-destructive', label: wpm < 100 ? 'Too Slow' : 'Too Fast' };
  };

  const getFillerStatus = (rate: number) => {
    if (rate <= 0.01) return { color: 'text-green-500', label: 'Excellent' };
    if (rate <= 0.03) return { color: 'text-yellow-500', label: 'Good' };
    return { color: 'text-destructive', label: 'High' };
  };

  const wpmStatus = getWpmStatus(metrics.estimatedWpm);
  const fillerStatus = getFillerStatus(metrics.fillerRate);

  // Get top fillers
  const topFillers = Object.entries(metrics.fillersByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (isMinimized) {
    return (
      <Card className="p-3 border-2 border-border cursor-pointer" onClick={onMinimizeToggle}>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <Mic className={`w-3 h-3 ${isUserSpeaking ? 'text-green-500' : 'text-muted-foreground'}`} />
            Voice Metrics
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{metrics.estimatedWpm} WPM</span>
            <Badge variant="outline" className="text-[10px]">
              {metrics.fillerCount} fillers
            </Badge>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-4 border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          VOICE METRICS
        </h3>
        <Badge variant={isUserSpeaking ? "default" : "outline"} className="text-[10px]">
          {isUserSpeaking ? 'LIVE' : 'PAUSED'}
        </Badge>
      </div>

      {/* WPM Display */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Speaking Rate
          </span>
          <div className="flex items-center gap-2">
            <span className={`font-bold font-mono ${wpmStatus.color}`}>
              {metrics.estimatedWpm} WPM
            </span>
            <Badge variant="outline" className="text-[9px]">
              {wpmStatus.label}
            </Badge>
          </div>
        </div>
        <Progress 
          value={Math.min(100, (metrics.estimatedWpm / 200) * 100)} 
          className="h-1.5" 
        />
        <p className="text-[9px] text-muted-foreground">
          Target: 120-180 WPM for clarity
        </p>
      </div>

      {/* Filler Words */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Filler Words
          </span>
          <div className="flex items-center gap-2">
            <span className={`font-bold font-mono ${fillerStatus.color}`}>
              {metrics.fillerCount}
            </span>
            <span className="text-muted-foreground">
              ({(metrics.fillerRate * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
        <Progress 
          value={Math.min(100, metrics.fillerRate * 1000)} 
          className="h-1.5" 
        />
        {topFillers.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {topFillers.map(([word, count]) => (
              <Badge key={word} variant="secondary" className="text-[9px] px-1.5 py-0">
                "{word}" × {count}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
        <div>
          <div className="text-lg font-bold font-mono">{metrics.totalWords}</div>
          <div className="text-[9px] text-muted-foreground">Words</div>
        </div>
        <div>
          <div className="text-lg font-bold font-mono flex items-center justify-center gap-1">
            <Timer className="w-3 h-3" />
            {Math.floor(metrics.speakingTimeSeconds / 60)}:{String(Math.floor(metrics.speakingTimeSeconds % 60)).padStart(2, '0')}
          </div>
          <div className="text-[9px] text-muted-foreground">Speaking Time</div>
        </div>
        <div>
          <div className={`text-lg font-bold font-mono ${fillerStatus.color}`}>
            {fillerStatus.label}
          </div>
          <div className="text-[9px] text-muted-foreground">Filler Status</div>
        </div>
      </div>
    </Card>
  );
};

export default VoiceMetricsPanel;
