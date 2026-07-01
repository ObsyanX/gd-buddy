import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TurnRow = {
  id: string;
  session_id: string;
  user_id: string | null;
  participant_kind: 'human' | 'ai';
  status: 'pending' | 'active' | 'expired' | 'yielded' | 'released';
  requested_at: string;
  granted_at: string | null;
  released_at: string | null;
};

export type MicRequestResult =
  | { status: 'granted'; turn_id: string; expires_at: string }
  | { status: 'queued'; turn_id: string; position: number }
  | { status: 'rate_limited' }
  | { status: 'error'; message: string };

/**
 * Fair, race-safe turn queue backed by public.speaking_turns +
 * request_mic/release_mic RPCs. See migration slice 1.
 *
 * - `request()` asks for the floor; resolves with granted/queued/rate_limited.
 * - `release()` yields the floor and promotes the next queued participant.
 * - `active` and `queue` reflect live realtime state.
 * - Debounce guards against rapid on/off toggling (Q9).
 */
export function useTurnQueue(sessionId: string | null) {
  const [active, setActive] = useState<TurnRow | null>(null);
  const [queue, setQueue] = useState<TurnRow[]>([]);
  const [selfTurnId, setSelfTurnId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const lastRequestRef = useRef<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('speaking_turns')
      .select('*')
      .eq('session_id', sessionId)
      .in('status', ['pending', 'active'])
      .order('requested_at', { ascending: true });
    const rows = (data ?? []) as unknown as TurnRow[];
    setActive(rows.find((r) => r.status === 'active') ?? null);
    setQueue(rows.filter((r) => r.status === 'pending'));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    refresh();
    const channel = supabase
      .channel(`turns:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'speaking_turns', filter: `session_id=eq.${sessionId}` },
        () => { refresh(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, refresh]);

  const request = useCallback(async (): Promise<MicRequestResult> => {
    if (!sessionId) return { status: 'error', message: 'no session' };
    const now = Date.now();
    if (now - lastRequestRef.current < 800) {
      return { status: 'rate_limited' };
    }
    lastRequestRef.current = now;

    const { data, error } = await supabase.rpc('request_mic', {
      _session_id: sessionId,
      _kind: 'human',
      _source: 'mic_press',
    });
    if (error) return { status: 'error', message: error.message };
    const result = data as MicRequestResult;
    if (result.status === 'granted' || result.status === 'queued') {
      setSelfTurnId(result.turn_id);
    }
    return result;
  }, [sessionId]);

  const release = useCallback(async () => {
    if (!sessionId) return;
    await supabase.rpc('release_mic', { _session_id: sessionId });
    setSelfTurnId(null);
  }, [sessionId]);

  const isHolder = !!(uid && active && active.user_id === uid);
  const selfPosition = uid ? queue.findIndex((q) => q.user_id === uid) : -1;

  return { active, queue, isHolder, selfPosition, request, release, refresh };
}
