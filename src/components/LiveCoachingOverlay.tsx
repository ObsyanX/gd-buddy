import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, AlertTriangle, TrendingUp, TrendingDown, 
  CheckCircle2, MessageSquare 
} from 'lucide-react';

interface CoachingSignal {
  type: 'success' | 'warning' | 'info';
  message: string;
  icon: any;
}

interface LiveCoachingOverlayProps {
  wpm: number;
  fillerCount: number;
  fillerRate: number;
  totalWords: number;
  speakingTimeSeconds: number;
  isUserSpeaking: boolean;
}

function getCoachingSignals(props: LiveCoachingOverlayProps): CoachingSignal[] {
  const signals: CoachingSignal[] = [];
  const { wpm, fillerRate, totalWords, speakingTimeSeconds } = props;

  // Only show coaching after some speaking
  if (speakingTimeSeconds < 5) return signals;

  // WPM coaching
  if (wpm > 0) {
    if (wpm > 200) {
      signals.push({ type: 'warning', message: 'Slow down — too fast', icon: TrendingDown });
    } else if (wpm < 100 && wpm > 0) {
      signals.push({ type: 'warning', message: 'Speed up slightly', icon: TrendingUp });
    } else if (wpm >= 120 && wpm <= 180) {
      signals.push({ type: 'success', message: 'Great pace!', icon: CheckCircle2 });
    }
  }

  // Filler coaching
  if (fillerRate > 0.05) {
    signals.push({ type: 'warning', message: 'Too many filler words', icon: AlertTriangle });
  } else if (totalWords > 20 && fillerRate <= 0.02) {
    signals.push({ type: 'success', message: 'Clean speech!', icon: CheckCircle2 });
  }

  // Brevity coaching
  if (totalWords > 80 && speakingTimeSeconds < 60) {
    signals.push({ type: 'info', message: 'Keep it concise', icon: MessageSquare });
  }

  return signals.slice(0, 3); // Max 3 signals
}

const SIGNAL_STYLES: Record<string, string> = {
  success: 'border-green-500/30 bg-green-500/5',
  warning: 'border-yellow-500/30 bg-yellow-500/5',
  info: 'border-blue-500/30 bg-blue-500/5',
};

const ICON_STYLES: Record<string, string> = {
  success: 'text-green-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export default function LiveCoachingOverlay(props: LiveCoachingOverlayProps) {
  const signals = getCoachingSignals(props);

  if (signals.length === 0 || !props.isUserSpeaking) return null;

  return (
    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase">
        <Zap className="w-3 h-3" />
        Live Coaching
      </div>
      {signals.map((signal, i) => {
        const Icon = signal.icon;
        return (
          <div
            key={i}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs font-medium ${SIGNAL_STYLES[signal.type]}`}
          >
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${ICON_STYLES[signal.type]}`} />
            <span>{signal.message}</span>
          </div>
        );
      })}
    </div>
  );
}
