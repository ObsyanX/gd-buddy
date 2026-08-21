import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Flag, Mic, Check } from "lucide-react";
import { ClosingSlot, formatClock } from "@/lib/discussion/gd-protocol";

interface ClosingRoundProps {
  slots: ClosingSlot[];
  activeId: string | null;
  secondsInSlot: number;
  doneIds: string[];
}

/** Phase D — enforced closing round-robin: fixed summary slot per participant. */
const ClosingRound = ({ slots, activeId, secondsInSlot, doneIds }: ClosingRoundProps) => (
  <Card className="border-2 border-accent/50 bg-accent/5 p-3 sm:p-4 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <Flag className="w-4 h-4" />
        Closing round
      </div>
      <span className="font-mono text-sm tabular-nums" aria-live="polite">
        {formatClock(secondsInSlot)}
      </span>
    </div>

    <div className="flex flex-wrap gap-1.5">
      {slots.map((s) => {
        const done = doneIds.includes(s.participantId);
        const active = s.participantId === activeId;
        return (
          <Badge
            key={s.participantId}
            variant={active ? "default" : "outline"}
            className={`border text-[10px] sm:text-xs ${active ? 'animate-pulse' : done ? 'opacity-60' : ''}`}
          >
            {active ? <Mic className="w-2.5 h-2.5 mr-1" /> : done ? <Check className="w-2.5 h-2.5 mr-1" /> : null}
            {s.isUser ? 'You' : s.name}
          </Badge>
        );
      })}
    </div>

    <p className="text-[11px] text-muted-foreground">
      {activeId
        ? slots.find((s) => s.participantId === activeId)?.isUser
          ? 'Your slot — give a 30-second summary of the discussion, not a new argument.'
          : 'Wait for your slot. Each participant gets a fixed summary window.'
        : 'Round complete — generating your report.'}
    </p>
  </Card>
);

export default ClosingRound;
