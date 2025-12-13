import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ParticipantPresence {
  oderId: string;
  isOnline: boolean;
  isTyping: boolean;
  lastSeen: string;
  displayName?: string;
}

interface UseMultiplayerPresenceProps {
  sessionId: string;
  enabled?: boolean;
}

export const useMultiplayerPresence = ({ sessionId, enabled = true }: UseMultiplayerPresenceProps) => {
  const { user } = useAuth();
  const [presenceState, setPresenceState] = useState<Record<string, ParticipantPresence>>({});
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId || !user) return;

    const presenceChannel = supabase.channel(`presence_${sessionId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const newPresenceState: Record<string, ParticipantPresence> = {};
        
        Object.entries(state).forEach(([key, presences]) => {
          const presence = (presences as any[])[0];
          if (presence) {
            newPresenceState[key] = {
              oderId: key,
              isOnline: true,
              isTyping: presence.isTyping || false,
              lastSeen: presence.lastSeen || new Date().toISOString(),
              displayName: presence.displayName,
            };
          }
        });
        
        setPresenceState(newPresenceState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presence = newPresences[0];
        if (presence) {
          setPresenceState(prev => ({
            ...prev,
            [key]: {
              oderId: key,
              isOnline: true,
              isTyping: presence.isTyping || false,
              lastSeen: new Date().toISOString(),
              displayName: presence.displayName,
            },
          }));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresenceState(prev => {
          const newState = { ...prev };
          if (newState[key]) {
            newState[key] = { ...newState[key], isOnline: false };
          }
          return newState;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            isTyping: false,
            lastSeen: new Date().toISOString(),
            displayName: user.email?.split('@')[0] || 'User',
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [sessionId, user, enabled]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (channel && user) {
      await channel.track({
        isTyping,
        lastSeen: new Date().toISOString(),
        displayName: user.email?.split('@')[0] || 'User',
      });
    }
  }, [channel, user]);

  const onlineParticipants = Object.values(presenceState).filter(p => p.isOnline);
  const typingParticipants = Object.values(presenceState).filter(p => p.isTyping);

  return {
    presenceState,
    onlineParticipants,
    typingParticipants,
    setTyping,
  };
};
