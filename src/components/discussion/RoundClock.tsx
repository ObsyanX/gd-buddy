import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, BookOpen, Flag } from "lucide-react";
import { ClockState, formatClock, GdFormatSpec } from "@/lib/discussion/gd-protocol";

interface RoundClockProps {
  clock: ClockState;
  format: GdFormatSpec;
  compact?: boolean;
}

const stageTone = (stage: ClockState['stage']) => {
  switch (stage) {
    case 'reading': return 'bg-primary/10 text-primary border-primary/40';
    case 'warning_2m': return 'bg-warning/15 text-warning border-warning/50';
    case 'warning_30s': return 'bg-destructive/15 text-destructive border-destructive/50 animate-pulse';
    case 'closing': return 'bg-accent/20 text-accent-foreground border-accent/50';
    case 'over': return 'bg-muted text-muted-foreground border-border';
    default: return '';
  }
};

const StageIcon = ({ stage, className }: { stage: ClockState['stage']; className?: string }) => {
  if (stage === 'reading') return <BookOpen className={className} />;
  if (stage === 'warning_2m' || stage === 'warning_30s') return <AlertTriangle className={className} />;
  if (stage === 'closing') return <Flag className={className} />;
  return <Clock className={className} />;
};

/** Visible GD round clock: stage label + countdown to the next boundary. */
const RoundClock = ({ clock, format, compact }: RoundClockProps) => {
  const size = compact ? 'text-[10px]' : 'text-xs';
  const icon = compact ? 'w-2.5 h-2.5 mr-0.5' : 'w-3 h-3 mr-1';

  return (
    <Badge
      variant="outline"
      className={`border font-mono ${size} ${stageTone(clock.stage)}`}
      title={`${format.label} — ${clock.label}. ${formatClock(clock.secondsRemaining)} until hard stop.`}
      aria-live={clock.stage === 'warning_30s' ? 'assertive' : 'polite'}
    >
      <StageIcon stage={clock.stage} className={icon} />
      {clock.stage === 'over' ? "Time's up" : `${clock.label} · ${formatClock(clock.secondsInStage)}`}
    </Badge>
  );
};

export default RoundClock;
