import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "lucide-react";

interface WPMDisplayProps {
  isRecording: boolean;
  recordingStartTime: number | null;
  estimatedWordCount: number;
}

export const WPMDisplay = ({ 
  isRecording, 
  recordingStartTime, 
  estimatedWordCount 
}: WPMDisplayProps) => {
  const [wpm, setWpm] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRecording || !recordingStartTime) {
      return;
    }

    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - recordingStartTime) / 1000;
      setElapsed(elapsedSeconds);
      
      if (elapsedSeconds > 0) {
        const calculatedWpm = Math.round((estimatedWordCount / elapsedSeconds) * 60);
        setWpm(calculatedWpm);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime, estimatedWordCount]);

  if (!isRecording) return null;

  const getWpmColor = () => {
    if (wpm < 100) return 'text-yellow-600';
    if (wpm > 180) return 'text-red-600';
    return 'text-green-600';
  };

  const getWpmLabel = () => {
    if (wpm < 100) return 'Slow';
    if (wpm > 180) return 'Fast';
    if (wpm >= 120 && wpm <= 150) return 'Ideal';
    return 'Good';
  };

  return (
    <div className="flex items-center justify-center gap-4 p-3 bg-muted/50 rounded border-2 border-border">
      <div className="flex items-center gap-2">
        <Gauge className={`w-5 h-5 ${getWpmColor()}`} />
        <span className={`text-2xl font-bold font-mono ${getWpmColor()}`}>
          {wpm}
        </span>
        <span className="text-sm text-muted-foreground">WPM</span>
      </div>
      
      <Badge 
        variant="outline" 
        className={`${getWpmColor()} border-current`}
      >
        {getWpmLabel()}
      </Badge>

      <div className="text-sm text-muted-foreground font-mono">
        {Math.floor(elapsed)}s
      </div>
    </div>
  );
};

// Helper hook to estimate word count from audio level activity
export const useWordCountEstimator = () => {
  const [estimatedWordCount, setEstimatedWordCount] = useState(0);
  const [lastActivityTime, setLastActivityTime] = useState<number | null>(null);

  const updateFromAudioLevel = (audioLevel: number) => {
    const now = Date.now();
    
    // If audio level is above threshold, consider it speech
    if (audioLevel > 0.02) {
      // Estimate roughly 2.5 words per second of speech
      if (lastActivityTime) {
        const timeSinceLastActivity = now - lastActivityTime;
        if (timeSinceLastActivity < 500) {
          // Continuous speech - add words based on time
          const wordsToAdd = (timeSinceLastActivity / 1000) * 2.5;
          setEstimatedWordCount(prev => prev + wordsToAdd);
        }
      }
      setLastActivityTime(now);
    }
  };

  const reset = () => {
    setEstimatedWordCount(0);
    setLastActivityTime(null);
  };

  return {
    estimatedWordCount,
    updateFromAudioLevel,
    reset,
  };
};
