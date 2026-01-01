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

// Utility function to clean streaming transcription artifacts (repeated phrases)
const cleanStreamingArtifacts = (text: string): string => {
  if (!text) return '';
  
  // Split into words and remove consecutive duplicates (streaming artifacts)
  const words = text.split(/\s+/);
  const cleaned: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const lastWord = cleaned[cleaned.length - 1];
    
    // Skip if this word is the same as the last word (immediate repeat)
    if (lastWord && word.toLowerCase() === lastWord.toLowerCase()) {
      continue;
    }
    
    // Check for phrase repetition (e.g., "I am I am getting" -> "I am getting")
    let isRepeatedPhrase = false;
    for (let lookback = 2; lookback <= 5 && lookback <= cleaned.length; lookback++) {
      const recentPhrase = cleaned.slice(-lookback).join(' ').toLowerCase();
      const upcomingWords = words.slice(i, i + lookback).join(' ').toLowerCase();
      if (recentPhrase === upcomingWords && recentPhrase.length > 3) {
        isRepeatedPhrase = true;
        i += lookback - 1; // Skip the repeated phrase
        break;
      }
    }
    
    if (!isRepeatedPhrase) {
      cleaned.push(word);
    }
  }
  
  return cleaned.join(' ');
};

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
  
  const speakingStartRef = useRef<number | null>(null);
  const totalSpeakingTimeRef = useRef(0);
  const lastTranscriptRef = useRef('');
  
  // CRITICAL FIX: Track finalized transcript segments by unique hash/content
  // This prevents counting the same text multiple times
  const processedSegmentsRef = useRef<Set<string>>(new Set());
  const accumulatedFinalWordsRef = useRef<string[]>([]);

  /**
   * Process only FINALIZED transcript text
   * Called when transcript is cleared/sent (meaning previous text was finalized)
   */
  const finalizeCurrentTranscript = useCallback((text: string) => {
    if (!text || text.trim().length === 0) return;
    
    // Clean streaming artifacts first
    const cleanedText = cleanStreamingArtifacts(text.trim().toLowerCase());
    
    // Generate a unique key for this segment to prevent duplicate counting
    const segmentKey = cleanedText;
    
    // Skip if we've already processed this exact segment
    if (processedSegmentsRef.current.has(segmentKey)) {
      console.log('[VoiceMetrics] Skipping duplicate segment:', segmentKey.slice(0, 50));
      return;
    }
    
    // Mark as processed
    processedSegmentsRef.current.add(segmentKey);
    
    // Extract words from finalized text
    const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
    
    // Add to accumulated final words
    accumulatedFinalWordsRef.current.push(...words);
    
    console.log('[VoiceMetrics] Finalized segment:', {
      words: words.length,
      totalAccumulated: accumulatedFinalWordsRef.current.length
    });
    
    // Recalculate metrics from accumulated words
    recalculateMetrics();
  }, []);

  /**
   * Recalculate all metrics from accumulated finalized words
   */
  const recalculateMetrics = useCallback(() => {
    const allWords = accumulatedFinalWordsRef.current;
    const totalWords = allWords.length;
    const allText = allWords.join(' ');
    
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
    let currentSpeakingTime = totalSpeakingTimeRef.current;
    
    if (speakingStartRef.current) {
      currentSpeakingTime += (now - speakingStartRef.current) / 1000;
    }
    
    const speakingTimeSeconds = Math.max(currentSpeakingTime, 1);
    const speakingTimeMinutes = speakingTimeSeconds / 60;
    
    // Calculate WPM - only if we have meaningful speaking time (at least 5 seconds)
    const estimatedWpm = speakingTimeSeconds >= 5
      ? Math.round(totalWords / speakingTimeMinutes)
      : 0;
    
    // Calculate filler rate
    const fillerRate = totalWords > 0 ? fillerCount / totalWords : 0;
    
    setMetrics({
      totalWords,
      fillerCount,
      fillerRate,
      estimatedWpm,
      speakingTimeSeconds: currentSpeakingTime,
      fillersByType,
    });
  }, []);

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

  // CRITICAL: Only process transcript when it's FINALIZED (cleared/sent)
  // This is triggered when currentTranscript becomes shorter or empty
  useEffect(() => {
    const prevTranscript = lastTranscriptRef.current;
    
    // If transcript was cleared/sent (length reduced significantly), finalize the previous text
    if (prevTranscript && 
        prevTranscript.trim().length > 0 && 
        (currentTranscript.length < prevTranscript.length * 0.5 || currentTranscript === '')) {
      finalizeCurrentTranscript(prevTranscript);
    }
    
    lastTranscriptRef.current = currentTranscript;
  }, [currentTranscript, finalizeCurrentTranscript]);

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
          estimatedWpm: currentSpeaking > 6 && prev.totalWords > 0
            ? Math.round(prev.totalWords / (currentSpeaking / 60))
            : prev.estimatedWpm
        }));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isUserSpeaking]);

  // Calculate live preview metrics (including current interim text for display only)
  const getLiveMetrics = useCallback((): VoiceSessionMetrics => {
    // Include current interim transcript for live display
    const currentWords = currentTranscript 
      ? cleanStreamingArtifacts(currentTranscript.toLowerCase()).split(/\s+/).filter(w => w.length > 0)
      : [];
    
    const totalWords = accumulatedFinalWordsRef.current.length + currentWords.length;
    const allText = [...accumulatedFinalWordsRef.current, ...currentWords].join(' ');
    
    // Count filler words
    let fillerCount = 0;
    const fillersByType: Record<string, number> = {};
    
    FILLER_WORDS.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = allText.match(regex);
      if (matches) {
        fillersByType[filler] = matches.length;
        fillerCount += matches.length;
      }
    });
    
    const now = Date.now();
    let currentSpeakingTime = totalSpeakingTimeRef.current;
    if (speakingStartRef.current) {
      currentSpeakingTime += (now - speakingStartRef.current) / 1000;
    }
    
    const speakingTimeSeconds = Math.max(currentSpeakingTime, 1);
    const estimatedWpm = speakingTimeSeconds >= 5
      ? Math.round(totalWords / (speakingTimeSeconds / 60))
      : 0;
    
    const fillerRate = totalWords > 0 ? fillerCount / totalWords : 0;
    
    return {
      totalWords,
      fillerCount,
      fillerRate,
      estimatedWpm,
      speakingTimeSeconds: currentSpeakingTime,
      fillersByType,
    };
  }, [currentTranscript]);

  // Use live metrics for display (includes current interim for responsiveness)
  const displayMetrics = getLiveMetrics();

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

  const wpmStatus = getWpmStatus(displayMetrics.estimatedWpm);
  const fillerStatus = getFillerStatus(displayMetrics.fillerRate);

  // Get top fillers
  const topFillers = Object.entries(displayMetrics.fillersByType)
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
            <span className="font-mono">{displayMetrics.estimatedWpm} WPM</span>
            <Badge variant="outline" className="text-[10px]">
              {displayMetrics.fillerCount} fillers
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
              {displayMetrics.estimatedWpm} WPM
            </span>
            <Badge variant="outline" className="text-[9px]">
              {wpmStatus.label}
            </Badge>
          </div>
        </div>
        <Progress 
          value={Math.min(100, (displayMetrics.estimatedWpm / 200) * 100)} 
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
              {displayMetrics.fillerCount}
            </span>
            <span className="text-muted-foreground">
              ({(displayMetrics.fillerRate * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
        <Progress 
          value={Math.min(100, displayMetrics.fillerRate * 1000)} 
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
          <div className="text-lg font-bold font-mono">{displayMetrics.totalWords}</div>
          <div className="text-[9px] text-muted-foreground">Words</div>
        </div>
        <div>
          <div className="text-lg font-bold font-mono flex items-center justify-center gap-1">
            <Timer className="w-3 h-3" />
            {Math.floor(displayMetrics.speakingTimeSeconds / 60)}:{String(Math.floor(displayMetrics.speakingTimeSeconds % 60)).padStart(2, '0')}
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
