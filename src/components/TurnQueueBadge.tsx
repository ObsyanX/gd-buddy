import { Badge } from '@/components/ui/badge';
import { Mic, Hand } from 'lucide-react';
import { useTurnQueue } from '@/hooks/useTurnQueue';

interface Props {
  sessionId: string | null;
}

/**
 * Compact live indicator for the speaking-turn queue.
 * - Shows who currently holds the floor.
 * - Shows the caller's own queue position if they're waiting.
 * Drop it into any session header/sidebar; it self-subscribes to realtime.
 */
export const TurnQueueBadge = ({ sessionId }: Props) => {
  const { active, queue, isHolder, selfPosition } = useTurnQueue(sessionId);

  if (!sessionId) return null;

  if (isHolder) {
    return (
      <Badge variant="default" className="gap-1">
        <Mic className="w-3 h-3" /> You have the floor
      </Badge>
    );
  }

  if (selfPosition >= 0) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Hand className="w-3 h-3" /> Queued #{selfPosition + 1} of {queue.length}
      </Badge>
    );
  }

  if (active) {
    return (
      <Badge variant="outline" className="gap-1">
        <Mic className="w-3 h-3" /> Speaker in progress
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 opacity-70">
      <Mic className="w-3 h-3" /> Floor open
    </Badge>
  );
};

export default TurnQueueBadge;
