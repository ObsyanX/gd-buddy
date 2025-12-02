import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceActivityIndicatorProps {
  isActive: boolean;
  participantName?: string;
}

export const VoiceActivityIndicator = ({ isActive, participantName }: VoiceActivityIndicatorProps) => {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-2 border-primary bg-primary/10 animate-pulse">
      <Volume2 className="w-4 h-4 text-primary" />
      <span className="text-sm font-bold text-primary">
        {participantName || 'AI'} IS SPEAKING...
      </span>
    </div>
  );
};
