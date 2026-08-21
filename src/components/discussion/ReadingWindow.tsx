import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, SkipForward } from "lucide-react";
import { formatClock, GdFormatSpec } from "@/lib/discussion/gd-protocol";

interface ReadingWindowProps {
  topic: string;
  category?: string | null;
  seconds: number;
  format: GdFormatSpec;
  onSkip: () => void;
}

/**
 * Phase D — the silent topic-reading window every real GD opens with.
 * The mic and the composer stay locked until this expires (or the user skips).
 */
const ReadingWindow = ({ topic, category, seconds, format, onSkip }: ReadingWindowProps) => (
  <Card className="border-2 border-primary/40 bg-primary/5 p-4 sm:p-6 text-center space-y-3">
    <div className="flex items-center justify-center gap-2 text-primary">
      <BookOpen className="w-4 h-4" />
      <span className="text-xs font-bold uppercase tracking-wide">Topic reading — mic locked</span>
    </div>

    <p className="text-base sm:text-xl font-bold leading-snug break-words">{topic}</p>
    {category && <p className="text-xs text-muted-foreground">{category}</p>}

    <p className="text-3xl sm:text-4xl font-mono font-bold tabular-nums" aria-live="polite">
      {formatClock(seconds)}
    </p>

    <p className="text-xs text-muted-foreground max-w-md mx-auto">
      {format.label} · Read the topic, pick your stance and line up two supporting points before the
      floor opens.
    </p>

    <Button variant="outline" size="sm" onClick={onSkip} className="border-2">
      <SkipForward className="w-3 h-3 mr-1" />
      I'm ready — open the floor
    </Button>
  </Card>
);

export default ReadingWindow;
