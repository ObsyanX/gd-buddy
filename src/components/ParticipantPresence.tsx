import { Badge } from '@/components/ui/badge';
import { User, Bot, Circle, Loader2 } from 'lucide-react';
import { ParticipantPresence as PresenceType } from '@/hooks/useMultiplayerPresence';

interface ParticipantPresenceProps {
  participants: any[];
  presenceState: Record<string, PresenceType>;
  typingParticipants: PresenceType[];
  isMultiplayer: boolean;
}

const ParticipantPresence = ({ 
  participants, 
  presenceState, 
  typingParticipants,
  isMultiplayer 
}: ParticipantPresenceProps) => {
  return (
    <div className="space-y-2">
      {participants.map((p) => {
        const presence = p.real_user_id ? presenceState[p.real_user_id] : null;
        const isOnline = presence?.isOnline ?? false;
        const isTyping = presence?.isTyping ?? false;
        
        return (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <div className="relative">
              {p.is_user ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              {isMultiplayer && p.is_user && p.real_user_id && (
                <Circle 
                  className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 ${
                    isOnline ? 'fill-green-500 text-green-500' : 'fill-muted text-muted'
                  }`} 
                />
              )}
            </div>
            <span className="font-bold flex-1">{p.persona_name}</span>
            {!p.is_user && (
              <Badge variant="outline" className="text-xs">{p.persona_tone}</Badge>
            )}
            {isMultiplayer && p.is_user && isOnline && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500">
                Online
              </Badge>
            )}
            {isTyping && (
              <Badge variant="outline" className="text-xs animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Typing
              </Badge>
            )}
          </div>
        );
      })}
      
      {isMultiplayer && typingParticipants.length > 0 && (
        <div className="text-xs text-muted-foreground font-mono pt-2 border-t border-border">
          {typingParticipants.length === 1 
            ? `${typingParticipants[0].displayName || 'Someone'} is typing...`
            : `${typingParticipants.length} people are typing...`
          }
        </div>
      )}
    </div>
  );
};

export default ParticipantPresence;
