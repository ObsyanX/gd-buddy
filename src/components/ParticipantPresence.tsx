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
    <div className="space-y-1.5">
      {participants.map((p) => {
        const presence = p.real_user_id ? presenceState[p.real_user_id] : null;
        const isOnline = presence?.isOnline ?? false;
        const isTyping = presence?.isTyping ?? false;
        
        return (
          <div 
            key={p.id} 
            className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center border border-border">
                {p.is_user ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              {isMultiplayer && p.is_user && p.real_user_id && (
                <Circle 
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${
                    isOnline ? 'fill-green-500 text-green-500' : 'fill-muted-foreground/30 text-muted-foreground/30'
                  }`} 
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-xs truncate block">{p.persona_name}</span>
              {!p.is_user && p.persona_tone && (
                <span className="text-[10px] text-muted-foreground">{p.persona_tone}</span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isMultiplayer && p.is_user && isOnline && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-500/10 text-green-500 border-green-500/50">
                  Online
                </Badge>
              )}
              {isTyping && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                  Typing
                </Badge>
              )}
            </div>
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
