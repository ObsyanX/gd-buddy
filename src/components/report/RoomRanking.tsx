import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Row {
  name: string;
  score: number;
  isMe: boolean;
  isUser: boolean;
}

const RoomRanking = ({ sessionId, myParticipantId }: { sessionId: string; myParticipantId?: string }) => {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data: participants } = await supabase
        .from('gd_participants')
        .select('id, persona_name, is_user, real_user_id')
        .eq('session_id', sessionId);
      const { data: messages } = await supabase
        .from('gd_messages')
        .select('participant_id, text')
        .eq('session_id', sessionId);
      if (!participants) return;

      const scores: Row[] = participants.map((p: any) => {
        const my = (messages || []).filter((m: any) => m.participant_id === p.id);
        const totalWords = my.reduce((sum, m: any) => sum + (m.text || '').split(/\s+/).filter(Boolean).length, 0);
        // Simple room score: contribution × avg length quality
        const avgLen = my.length ? totalWords / my.length : 0;
        const contribScore = Math.min(50, my.length * 5);
        const qualityScore = Math.min(50, avgLen * 0.8);
        return {
          name: p.persona_name || 'Participant',
          score: Math.round(contribScore + qualityScore),
          isMe: p.id === myParticipantId,
          isUser: !!p.is_user,
        };
      });
      scores.sort((a, b) => b.score - a.score);
      setRows(scores);
    })();
  }, [sessionId, myParticipantId]);

  if (rows.length < 2) return null;

  const icons = [Trophy, Medal, Award];

  return (
    <Card className="p-6 border-4 border-border space-y-3">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <Trophy className="w-5 h-5" /> RANKING IN THIS ROOM
      </h3>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const Icon = icons[i] || Trophy;
          return (
            <div
              key={i}
              className={`flex items-center justify-between p-3 border-2 border-border rounded ${
                r.isMe ? 'bg-primary/10 border-primary' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold w-6">#{i + 1}</span>
                {i < 3 && <Icon className="w-5 h-5 text-primary" />}
                <span className="font-bold">{r.name}</span>
                {r.isMe && <Badge variant="default">You</Badge>}
                {!r.isUser && <Badge variant="secondary">AI</Badge>}
              </div>
              <span className="font-mono font-bold">{r.score}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default RoomRanking;
