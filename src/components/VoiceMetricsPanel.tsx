import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, Volume2, AlertTriangle, TrendingUp, Timer } from 'lucide-react';
import LiveCoachingOverlay from './LiveCoachingOverlay';

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
  onMetricsUpdate?: (metrics: VoiceSessionMetrics) => void;
}

const splitNormalizedWords = (text: string): string[] => {
  if (!text) return [];
  return cleanStreamingArtifacts(text.trim().toLowerCase())
    .split(/\s+/)
    .filter((word) => word.length > 0);
};

/**
 * Prevent double counting when current transcript still contains a finalized tail.
 * Example:
 * finalized: ["ai", "has", "both"]
 * current:   ["ai", "has", "both", "positive", "aspects"]
 * result:    ["positive", "aspects"]
 */
const getIncrementalTranscriptWords = (
  finalizedWords: string[],
  currentTranscript: string
): string[] => {
  const currentWords = splitNormalizedWords(currentTranscript);
  if (currentWords.length === 0 || finalizedWords.length === 0) return currentWords;

  const maxOverlap = Math.min(finalizedWords.length, currentWords.length);
  let overlapCount = 0;

  for (let overlap = maxOverlap; overlap >= 1; overlap--) {
    const finalizedSuffix = finalizedWords.slice(-overlap).join(' ');
    const currentPrefix = currentWords.slice(0, overlap).join(' ');

    if (finalizedSuffix === currentPrefix) {
      overlapCount = overlap;
      break;
    }
  }

  return currentWords.slice(overlapCount);
};

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
  onMinimizeToggle,
  onMetricsUpdate
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
  const lastTranscriptLengthRef = useRef(0);
  
  // Track accumulated finalized words and latest finalized transcript to avoid double-counting
  const accumulatedFinalWordsRef = useRef<string[]>([]);
  const lastFinalizedTranscriptRef = useRef('');
  // Track actual voice activity via transcript changes (not just mic-open state)
  const lastTranscriptChangeRef = useRef<number>(0);
  const SILENCE_THRESHOLD_MS = 2000; // Stop counting speaking time after 2s of no transcript change
  // Debounce speaking state to avoid rapid true/false toggles
  const stableSpeakingRef = useRef(false);
  const speakingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stableSpeaking, setStableSpeaking] = useState(false);

  // Debounce isUserSpeaking to prevent rapid toggling (console shows 10+ toggles/sec)
  useEffect(() => {
    if (isUserSpeaking) {
      // Immediately mark as speaking
      if (speakingDebounceRef.current) clearTimeout(speakingDebounceRef.current);
      if (!stableSpeakingRef.current) {
        stableSpeakingRef.current = true;
        setStableSpeaking(true);
      }
    } else {
      // Delay marking as not speaking by 500ms to absorb rapid toggles
      if (speakingDebounceRef.current) clearTimeout(speakingDebounceRef.current);
      speakingDebounceRef.current = setTimeout(() => {
        stableSpeakingRef.current = false;
        setStableSpeaking(false);
      }, 500);
    }
    return () => {
      if (speakingDebounceRef.current) clearTimeout(speakingDebounceRef.current);
    };
  }, [isUserSpeaking]);

  /**
   * Process only FINALIZED transcript text.
   * Appends only incremental words to avoid interim/final overlap inflation.
   */
  const finalizeCurrentTranscript = useCallback((text: string) => {
    if (!text || text.trim().length === 0) return;

    const cleanedText = cleanStreamingArtifacts(text.trim().toLowerCase());
    if (!cleanedText) return;

    // Skip exact duplicate finalize calls
    if (cleanedText === lastFinalizedTranscriptRef.current) {
      return;
    }

    // Append only the delta vs already finalized words
    const incrementalWords = getIncrementalTranscriptWords(
      accumulatedFinalWordsRef.current,
      cleanedText
    );

    if (incrementalWords.length > 0) {
      accumulatedFinalWordsRef.current.push(...incrementalWords);

      console.log('[VoiceMetrics] Finalized incremental segment:', {
        words: incrementalWords.length,
        totalAccumulated: accumulatedFinalWordsRef.current.length,
        text: cleanedText.slice(0, 80)
      });

      recalculateMetrics();
    }

    lastFinalizedTranscriptRef.current = cleanedText;
  }, []);

  /**
   * Recalculate all metrics from accumulated finalized words
   */
  const recalculateMetrics = useCallback(() => {
    const allWords = accumulatedFinalWordsRef.current;
    const totalWords = allWords.length;
    const allText = allWords.join(' ');
    
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

    let currentSpeakingTime = totalSpeakingTimeRef.current;
    if (speakingStartRef.current) {
      currentSpeakingTime += (Date.now() - speakingStartRef.current) / 1000;
    }
    const speakingTimeSeconds = Math.max(currentSpeakingTime, 1);
    const rawWpm = speakingTimeSeconds >= 5
      ? Math.round(totalWords / (speakingTimeSeconds / 60))
      : 0;
    // Sanity cap: human speech cannot exceed ~400 WPM
    const estimatedWpm = Math.min(400, rawWpm);
    
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

  // Track speaking time using STABLE speaking state
  useEffect(() => {
    if (stableSpeaking) {
      if (!speakingStartRef.current) {
        speakingStartRef.current = Date.now();
      }
    } else {
      if (speakingStartRef.current) {
        totalSpeakingTimeRef.current += (Date.now() - speakingStartRef.current) / 1000;
        speakingStartRef.current = null;
      }
      
      // Finalize transcript when user truly stops speaking
      const currentText = lastTranscriptRef.current;
      if (currentText && currentText.trim().length > 0) {
        finalizeCurrentTranscript(currentText);
      }
    }
  }, [stableSpeaking, finalizeCurrentTranscript]);

  // Process transcript when it's cleared/sent + track transcript activity
  useEffect(() => {
    const prevTranscript = lastTranscriptRef.current;
    const prevLength = lastTranscriptLengthRef.current;
    
    // Track when transcript actually changes (real speech activity)
    if (currentTranscript.length > prevLength) {
      lastTranscriptChangeRef.current = Date.now();
      // Restart speaking clock if it was paused due to silence
      if (stableSpeaking && !speakingStartRef.current) {
        speakingStartRef.current = Date.now();
      }
    }
    
    // If transcript was cleared/sent (length reduced significantly), finalize previous text
    if (prevTranscript && 
        prevTranscript.trim().length > 0 && 
        (currentTranscript.length < prevLength * 0.5 || currentTranscript === '')) {
      finalizeCurrentTranscript(prevTranscript);
    }
    
    lastTranscriptRef.current = currentTranscript;
    lastTranscriptLengthRef.current = currentTranscript.length;
  }, [currentTranscript, finalizeCurrentTranscript]);

  // Update speaking time display periodically — only count time when transcript is actively growing
  useEffect(() => {
    if (!stableSpeaking) return;
    
    const interval = setInterval(() => {
      if (speakingStartRef.current) {
        const now = Date.now();
        const timeSinceLastChange = now - lastTranscriptChangeRef.current;
        const isActuallySpeaking = timeSinceLastChange < SILENCE_THRESHOLD_MS;
        
        // If user hasn't produced new words in 2s, pause speaking time accumulation
        if (!isActuallySpeaking && speakingStartRef.current) {
          // Freeze: commit accumulated time up to silence threshold
          const activeUntil = lastTranscriptChangeRef.current > 0
            ? Math.min(now, lastTranscriptChangeRef.current + SILENCE_THRESHOLD_MS)
            : now;
          const elapsed = Math.max(0, (activeUntil - speakingStartRef.current) / 1000);
          if (elapsed > 0) {
            totalSpeakingTimeRef.current += elapsed;
          }
          speakingStartRef.current = null; // Pause the clock
        }
        
        const currentSpeaking = totalSpeakingTimeRef.current + 
          (speakingStartRef.current ? (now - speakingStartRef.current) / 1000 : 0);
        
        setMetrics(prev => ({
          ...prev,
          speakingTimeSeconds: currentSpeaking,
          estimatedWpm: currentSpeaking > 6 && prev.totalWords > 0
            ? Math.min(400, Math.round(prev.totalWords / (currentSpeaking / 60)))
            : prev.estimatedWpm
        }));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [stableSpeaking]);

  // Calculate live preview metrics (finalized words + true incremental interim words)
  const getLiveMetrics = useCallback((): VoiceSessionMetrics => {
    const incrementalCurrentWords = getIncrementalTranscriptWords(
      accumulatedFinalWordsRef.current,
      currentTranscript
    );
    
    const totalWords = accumulatedFinalWordsRef.current.length + incrementalCurrentWords.length;
    const allText = [...accumulatedFinalWordsRef.current, ...incrementalCurrentWords].join(' ');
    
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
    const rawWpm = speakingTimeSeconds >= 5
      ? Math.round(totalWords / (speakingTimeSeconds / 60))
      : 0;
    // Sanity cap: human speech cannot exceed ~400 WPM
    const estimatedWpm = Math.min(400, rawWpm);
    
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

  useEffect(() => {
    onMetricsUpdate?.(displayMetrics);
  }, [
    onMetricsUpdate,
    displayMetrics.totalWords,
    displayMetrics.fillerCount,
    displayMetrics.fillerRate,
    displayMetrics.estimatedWpm,
    displayMetrics.speakingTimeSeconds,
  ]);

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
  const isHighWpmWarning = displayMetrics.estimatedWpm > 250;

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
    <Card className="p-3 sm:p-4 border-4 border-border space-y-2 sm:space-y-3 w-full max-w-full overflow-visible shrink-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">VOICE METRICS</span>
        </h3>
        <Badge variant={isUserSpeaking ? "default" : "outline"} className="text-[9px] sm:text-[10px] shrink-0">
          {isUserSpeaking ? 'LIVE' : 'PAUSED'}
        </Badge>
      </div>

      {/* WPM Display */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] sm:text-xs gap-2">
          <span className="flex items-center gap-1 min-w-0 shrink-0">
            <TrendingUp className="w-3 h-3 shrink-0" />
            <span className="hidden xs:inline">Speaking Rate</span>
            <span className="xs:hidden">Rate</span>
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className={`font-bold font-mono text-[11px] sm:text-xs ${wpmStatus.color}`}>
              {displayMetrics.estimatedWpm} <span className="text-[9px] sm:text-[10px]">WPM</span>
            </span>
            <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5">
              {wpmStatus.label}
            </Badge>
          </div>
        </div>
        <Progress 
          value={Math.min(100, (displayMetrics.estimatedWpm / 200) * 100)} 
          className="h-1 sm:h-1.5" 
        />
        <p className="text-[8px] sm:text-[9px] text-muted-foreground">
          Target: 120-180 WPM for clarity
        </p>
        {isHighWpmWarning && (
          <div className="mt-1 rounded-sm border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] sm:text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>You're speaking very fast (&gt;250 WPM). Slow down for better clarity.</span>
          </div>
        )}
      </div>

      {/* Filler Words */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] sm:text-xs gap-2">
          <span className="flex items-center gap-1 min-w-0 shrink-0">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="hidden xs:inline">Filler Words</span>
            <span className="xs:hidden">Fillers</span>
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className={`font-bold font-mono text-[11px] sm:text-xs ${fillerStatus.color}`}>
              {displayMetrics.fillerCount}
            </span>
            <span className="text-muted-foreground text-[10px] sm:text-xs">
              ({(displayMetrics.fillerRate * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
        <Progress 
          value={Math.min(100, displayMetrics.fillerRate * 1000)} 
          className="h-1 sm:h-1.5" 
        />
        {topFillers.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {topFillers.map(([word, count]) => (
              <Badge key={word} variant="secondary" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0">
                "{word}" × {count}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Live Coaching */}
      <LiveCoachingOverlay
        wpm={displayMetrics.estimatedWpm}
        fillerCount={displayMetrics.fillerCount}
        fillerRate={displayMetrics.fillerRate}
        totalWords={displayMetrics.totalWords}
        speakingTimeSeconds={displayMetrics.speakingTimeSeconds}
        isUserSpeaking={isUserSpeaking}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t border-border text-center">
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-bold font-mono truncate">{displayMetrics.totalWords}</div>
          <div className="text-[8px] sm:text-[9px] text-muted-foreground">Words</div>
        </div>
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-bold font-mono flex items-center justify-center gap-0.5 sm:gap-1">
            <Timer className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            <span className="truncate">{Math.floor(displayMetrics.speakingTimeSeconds / 60)}:{String(Math.floor(displayMetrics.speakingTimeSeconds % 60)).padStart(2, '0')}</span>
          </div>
          <div className="text-[8px] sm:text-[9px] text-muted-foreground">Speaking Time</div>
        </div>
        <div className="min-w-0">
          <div className={`text-sm sm:text-lg font-bold font-mono truncate ${fillerStatus.color}`}>
            {fillerStatus.label}
          </div>
          <div className="text-[8px] sm:text-[9px] text-muted-foreground">Filler Status</div>
        </div>
      </div>
    </Card>
  );
};

export default VoiceMetricsPanel;
