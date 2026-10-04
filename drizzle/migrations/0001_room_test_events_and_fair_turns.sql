CREATE TABLE public.room_test_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL,
  ok boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_drive boolean NOT NULL DEFAULT false,
  is_group boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX room_test_events_session_idx ON public.room_test_events(session_id, created_at);
CREATE INDEX room_test_events_kind_idx ON public.room_test_events(kind, created_at DESC);
GRANT SELECT, INSERT ON public.room_test_events TO authenticated;
GRANT ALL ON public.room_test_events TO service_role;
ALTER TABLE public.room_test_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own room events" ON public.room_test_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (session_id IS NULL OR public.can_access_session(session_id, auth.uid())));
CREATE POLICY "read own or hosted room events" ON public.room_test_events FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (session_id IS NOT NULL AND public.owns_session(session_id, auth.uid())));

ALTER TABLE public.mock_drives ADD COLUMN IF NOT EXISTS group_size integer NOT NULL DEFAULT 6;
ALTER TABLE public.mock_drives ADD COLUMN IF NOT EXISTS room_codes text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.request_mic(_session_id uuid, _kind text DEFAULT 'human'::text, _source text DEFAULT 'mic_press'::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_holder uuid; v_expires timestamptz; v_turn_id uuid; v_position int;
  v_slot interval := interval '45 seconds';
  v_prio int := CASE WHEN _kind = 'human' THEN 1 ELSE 0 END;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_access_session(_session_id, v_uid) THEN RAISE EXCEPTION 'Not a participant of this session'; END IF;
  IF (SELECT count(*) FROM public.speaking_turns WHERE session_id=_session_id AND user_id=v_uid AND requested_at > now() - interval '10 seconds') >= 3 THEN
    RETURN jsonb_build_object('status','rate_limited');
  END IF;
  SELECT mic_lock_holder, mic_lock_expires_at INTO v_holder, v_expires FROM public.gd_sessions WHERE id=_session_id FOR UPDATE;
  IF v_holder IS NOT NULL AND v_expires IS NOT NULL AND v_expires < now() THEN
    UPDATE public.speaking_turns SET status='expired', released_at=now() WHERE session_id=_session_id AND status='active';
    UPDATE public.gd_sessions SET mic_lock_holder=NULL, mic_lock_expires_at=NULL WHERE id=_session_id;
    v_holder := NULL;
  END IF;
  IF v_holder = v_uid THEN
    RETURN jsonb_build_object('status','granted','turn_id',(SELECT id FROM public.speaking_turns WHERE session_id=_session_id AND status='active' LIMIT 1),'expires_at',v_expires);
  END IF;
  IF v_holder IS NULL THEN
    INSERT INTO public.speaking_turns(session_id,user_id,participant_kind,source,status,granted_at,priority)
    VALUES (_session_id,v_uid,_kind,_source,'active',now(),v_prio) RETURNING id INTO v_turn_id;
    UPDATE public.gd_sessions SET mic_lock_holder=v_uid, mic_lock_expires_at=now()+v_slot, last_activity_at=now() WHERE id=_session_id;
    RETURN jsonb_build_object('status','granted','turn_id',v_turn_id,'expires_at',now()+v_slot,'slot_seconds',45);
  END IF;
  -- one pending request per user
  SELECT id INTO v_turn_id FROM public.speaking_turns WHERE session_id=_session_id AND user_id=v_uid AND status='pending' LIMIT 1;
  IF v_turn_id IS NULL THEN
    INSERT INTO public.speaking_turns(session_id,user_id,participant_kind,source,status,priority)
    VALUES (_session_id,v_uid,_kind,_source,'pending',v_prio) RETURNING id INTO v_turn_id;
  END IF;
  SELECT count(*) INTO v_position FROM public.speaking_turns WHERE session_id=_session_id AND status='pending' AND requested_at <= now();
  RETURN jsonb_build_object('status','queued','turn_id',v_turn_id,'position',v_position,'slot_seconds',45);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_mic(_session_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid(); v_holder uuid; v_expires timestamptz; v_next_id uuid; v_next_user uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT mic_lock_holder, mic_lock_expires_at INTO v_holder, v_expires FROM public.gd_sessions WHERE id=_session_id FOR UPDATE;
  -- holder, admin, or anyone once the slot has run out may pass the floor on
  IF v_holder IS DISTINCT FROM v_uid AND NOT public.has_role(v_uid,'admin'::app_role)
     AND NOT (v_expires IS NOT NULL AND v_expires < now() AND public.can_access_session(_session_id, v_uid)) THEN
    RETURN jsonb_build_object('status','not_holder');
  END IF;
  UPDATE public.speaking_turns SET status=CASE WHEN v_expires < now() THEN 'expired' ELSE 'released' END, released_at=now(),
         duration_ms=EXTRACT(EPOCH FROM (now()-granted_at))::int*1000
   WHERE session_id=_session_id AND status='active';
  -- fairness: humans first, then least total airtime, never the same person twice when others wait
  WITH air AS (
    SELECT user_id, COALESCE(sum(duration_ms),0) AS ms FROM public.speaking_turns
     WHERE session_id=_session_id AND status IN ('released','expired','yielded') GROUP BY user_id
  ), next_turn AS (
    SELECT t.id, t.user_id FROM public.speaking_turns t LEFT JOIN air a ON a.user_id=t.user_id
     WHERE t.session_id=_session_id AND t.status='pending'
     ORDER BY (t.user_id = v_holder) ASC, t.priority DESC, COALESCE(a.ms,0) ASC, t.requested_at ASC
     LIMIT 1
  )
  UPDATE public.speaking_turns st SET status='active', granted_at=now() FROM next_turn
   WHERE st.id=next_turn.id RETURNING st.id, st.user_id INTO v_next_id, v_next_user;
  UPDATE public.gd_sessions SET mic_lock_holder=v_next_user,
         mic_lock_expires_at=CASE WHEN v_next_user IS NOT NULL THEN now()+interval '45 seconds' END, last_activity_at=now()
   WHERE id=_session_id;
  RETURN jsonb_build_object('status','released','next_turn_id',v_next_id,'next_user_id',v_next_user);
END;
$function$;