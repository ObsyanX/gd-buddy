import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  grantedAt: string | null | undefined;
  slotSeconds: number;
  isSelf: boolean;
  speakerLabel?: string;
}

/** Remaining seconds of the current speaking slot (null when no slot). */
export function useSlotRemaining(grantedAt: string | null | undefined, slotSeconds: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!grantedAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [grantedAt]);
  if (!grantedAt) return null;
  const end = new Date(grantedAt).getTime() + slotSeconds * 1000;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

/** Countdown shown above the input while someone holds the floor. */
export const SpeakerCountdown = ({ grantedAt, slotSeconds, isSelf, speakerLabel }: Props) => {
  const remaining = useSlotRemaining(grantedAt, slotSeconds);
  if (remaining === null) return null;
  const warn = remaining <= 10;
  const pct = Math.min(100, (remaining / slotSeconds) * 100);
  return (
    <div
      role="timer"
      aria-live={warn ? 'assertive' : 'off'}
      className={cn(
        'mx-auto mb-2 w-full max-w-3xl rounded-lg border px-3 py-2 text-xs',
        warn ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-border bg-muted/40 text-muted-foreground',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          <Timer className="h-3.5 w-3.5" />
          {isSelf ? 'Your speaking slot' : `${speakerLabel ?? 'Speaker'} has the floor`}
        </span>
        <span className="tabular-nums font-semibold">
          {remaining}s{warn && isSelf ? ' · wrap up now' : ''}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-border">
        <div
          className={cn('h-full transition-all', warn ? 'bg-destructive' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default SpeakerCountdown;
