import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logRoomEvent } from '@/lib/room-log';

type TurnRow = {
  id: string;
  session_id: string;
  user_id: string | null;
  participant_kind: 'human' | 'ai';
  status: 'pending' | 'active' | 'expired' | 'yielded' | 'released';
  requested_at: string;
  granted_at: string | null;
  released_at: string | null;
  slot_seconds?: number | null;
};

/** An active slot whose time ran out (the server closes it on the next request). */
export function isSlotOver(row: Pick<TurnRow, 'granted_at' | 'slot_seconds'> | null, now = Date.now()): boolean {
  if (!row?.granted_at) return false;
  const ends = new Date(row.granted_at).getTime() + (Number(row.slot_seconds) || 45) * 1000;
  return now > ends + 2000;
}

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
  const [activeRow, setActive] = useState<TurnRow | null>(null);
  const [, setTick] = useState(0);
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
      .channel(`turns:${sessionId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'speaking_turns', filter: `session_id=eq.${sessionId}` },
        () => { refresh(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, refresh]);

  // Re-render when the current slot runs out, so an expired slot (e.g. from a
  // closed tab) stops showing as "has the floor".
  useEffect(() => {
    if (!activeRow?.granted_at) return;
    const ends = new Date(activeRow.granted_at).getTime() + (Number(activeRow.slot_seconds) || 45) * 1000 + 2100;
    const id = window.setTimeout(() => setTick((t) => t + 1), Math.max(0, ends - Date.now()));
    return () => window.clearTimeout(id);
  }, [activeRow?.id, activeRow?.granted_at, activeRow?.slot_seconds]);
  const active = activeRow && !isSlotOver(activeRow) ? activeRow : null;

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
    logRoomEvent('floor_request', !error, { kind: 'human' });
    if (error) return { status: 'error', message: error.message };
    const result = data as MicRequestResult;
    if (result.status === 'granted') logRoomEvent('floor_grant', true, { slot_seconds: (result as any).slot_seconds });
    else if (result.status === 'queued') logRoomEvent('floor_queue', true, { position: result.position });
    else logRoomEvent('floor_request', false, { status: result.status });
    if (result.status === 'granted' || result.status === 'queued') {
      setSelfTurnId(result.turn_id);
    }
    return result;
  }, [sessionId]);

  const release = useCallback(async () => {
    if (!sessionId) return;
    const { error } = await supabase.rpc('release_mic', { _session_id: sessionId });
    logRoomEvent('floor_release', !error);
    setSelfTurnId(null);
  }, [sessionId]);

  // Ownership must match participant_kind too: AI turns are inserted with the
  // requesting user's id, so a user-only check would show an AI slot as "yours".
  const isHolder = !!(uid && active && active.user_id === uid && active.participant_kind === 'human');
  const selfPosition = uid ? queue.findIndex((q) => q.user_id === uid && q.participant_kind === 'human') : -1;

  return { active, queue, isHolder, selfPosition, request, release, refresh };
}
