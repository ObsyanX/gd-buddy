
-- ============ SCHEMA ADDITIONS ============
ALTER TABLE public.gd_sessions
  ADD COLUMN IF NOT EXISTS mic_lock_holder uuid,
  ADD COLUMN IF NOT EXISTS mic_lock_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'lobby'
    CHECK (phase IN ('lobby','intro','discussion','conclusion','ended'));

-- ============ speaking_turns ============
CREATE TABLE IF NOT EXISTS public.speaking_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  user_id uuid,
  participant_id uuid,
  participant_kind text NOT NULL DEFAULT 'human' CHECK (participant_kind IN ('human','ai')),
  source text NOT NULL DEFAULT 'mic_press' CHECK (source IN ('mic_press','raise_hand','ai_pick','host_pick')),
  priority int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','yielded','released')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  granted_at timestamptz,
  released_at timestamptz,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speaking_turns_session_status
  ON public.speaking_turns(session_id, status, requested_at);

GRANT SELECT ON public.speaking_turns TO authenticated;
GRANT ALL ON public.speaking_turns TO service_role;

ALTER TABLE public.speaking_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read turns in their session"
  ON public.speaking_turns FOR SELECT
  TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

-- writes only via SECURITY DEFINER functions below; no direct INSERT/UPDATE/DELETE policies

-- ============ moderator_decisions ============
CREATE TABLE IF NOT EXISTS public.moderator_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid,
  reason text,
  confidence numeric(4,3),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  applied boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderator_decisions_session
  ON public.moderator_decisions(session_id, created_at DESC);

GRANT SELECT ON public.moderator_decisions TO authenticated;
GRANT ALL ON public.moderator_decisions TO service_role;

ALTER TABLE public.moderator_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read decisions for their session"
  ON public.moderator_decisions FOR SELECT
  TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

CREATE POLICY "Admins can read all moderator decisions"
  ON public.moderator_decisions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.request_mic(
  _session_id uuid,
  _kind text DEFAULT 'human',
  _source text DEFAULT 'mic_press'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_holder uuid;
  v_expires timestamptz;
  v_turn_id uuid;
  v_position int;
  v_last_spoke timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_access_session(_session_id, v_uid) THEN
    RAISE EXCEPTION 'Not a participant of this session';
  END IF;

  -- rate limit: max 3 mic requests / 10s per user per session
  IF (
    SELECT count(*) FROM public.speaking_turns
    WHERE session_id = _session_id
      AND user_id = v_uid
      AND requested_at > now() - interval '10 seconds'
  ) >= 3 THEN
    RETURN jsonb_build_object('status','rate_limited');
  END IF;

  -- lock the session row
  SELECT mic_lock_holder, mic_lock_expires_at
    INTO v_holder, v_expires
    FROM public.gd_sessions
   WHERE id = _session_id
   FOR UPDATE;

  -- if current holder's turn expired, clear it
  IF v_holder IS NOT NULL AND v_expires IS NOT NULL AND v_expires < now() THEN
    UPDATE public.speaking_turns
       SET status = 'expired', released_at = now()
     WHERE session_id = _session_id AND status = 'active';
    UPDATE public.gd_sessions
       SET mic_lock_holder = NULL, mic_lock_expires_at = NULL
     WHERE id = _session_id;
    v_holder := NULL;
  END IF;

  -- fetch fairness signal
  SELECT max(released_at) INTO v_last_spoke
    FROM public.speaking_turns
   WHERE session_id = _session_id AND user_id = v_uid AND status IN ('released','expired','yielded');

  IF v_holder IS NULL THEN
    INSERT INTO public.speaking_turns(session_id, user_id, participant_kind, source, status, granted_at)
    VALUES (_session_id, v_uid, _kind, _source, 'active', now())
    RETURNING id INTO v_turn_id;

    UPDATE public.gd_sessions
       SET mic_lock_holder = v_uid,
           mic_lock_expires_at = now() + interval '90 seconds',
           last_activity_at = now()
     WHERE id = _session_id;

    RETURN jsonb_build_object('status','granted','turn_id',v_turn_id,'expires_at', now() + interval '90 seconds');
  END IF;

  -- queue behind current holder
  INSERT INTO public.speaking_turns(session_id, user_id, participant_kind, source, status)
  VALUES (_session_id, v_uid, _kind, _source, 'pending')
  RETURNING id INTO v_turn_id;

  SELECT count(*) INTO v_position
    FROM public.speaking_turns
   WHERE session_id = _session_id AND status = 'pending' AND requested_at <= now();

  RETURN jsonb_build_object('status','queued','turn_id',v_turn_id,'position',v_position);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_mic(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_holder uuid;
  v_next_id uuid;
  v_next_user uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT mic_lock_holder INTO v_holder FROM public.gd_sessions WHERE id = _session_id FOR UPDATE;

  IF v_holder IS DISTINCT FROM v_uid AND NOT public.has_role(v_uid,'admin'::app_role) THEN
    RETURN jsonb_build_object('status','not_holder');
  END IF;

  UPDATE public.speaking_turns
     SET status = 'released', released_at = now(),
         duration_ms = EXTRACT(EPOCH FROM (now() - granted_at))::int * 1000
   WHERE session_id = _session_id AND status = 'active';

  -- promote next queued turn using fairness tiebreak (least-recent speaker first)
  WITH next_turn AS (
    SELECT t.id, t.user_id
      FROM public.speaking_turns t
      LEFT JOIN LATERAL (
        SELECT max(released_at) AS last_at
          FROM public.speaking_turns
         WHERE session_id = _session_id AND user_id = t.user_id AND status IN ('released','expired','yielded')
      ) f ON true
     WHERE t.session_id = _session_id AND t.status = 'pending'
     ORDER BY t.priority DESC, COALESCE(f.last_at, 'epoch'::timestamptz) ASC, t.requested_at ASC
     LIMIT 1
  )
  UPDATE public.speaking_turns st
     SET status = 'active', granted_at = now()
    FROM next_turn
   WHERE st.id = next_turn.id
  RETURNING st.id, st.user_id INTO v_next_id, v_next_user;

  UPDATE public.gd_sessions
     SET mic_lock_holder = v_next_user,
         mic_lock_expires_at = CASE WHEN v_next_user IS NOT NULL THEN now() + interval '90 seconds' END,
         last_activity_at = now()
   WHERE id = _session_id;

  RETURN jsonb_build_object('status','released','next_turn_id',v_next_id,'next_user_id',v_next_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_stale_turns()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  WITH stale AS (
    SELECT s.id
      FROM public.gd_sessions s
     WHERE s.mic_lock_expires_at IS NOT NULL
       AND s.mic_lock_expires_at < now()
  ),
  upd AS (
    UPDATE public.speaking_turns t
       SET status = 'expired', released_at = now()
      FROM stale
     WHERE t.session_id = stale.id AND t.status = 'active'
    RETURNING t.id
  )
  SELECT count(*)::int INTO v_count FROM upd;

  UPDATE public.gd_sessions
     SET mic_lock_holder = NULL, mic_lock_expires_at = NULL
   WHERE mic_lock_expires_at IS NOT NULL AND mic_lock_expires_at < now();

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_mic(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_mic(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_turns() TO service_role;

-- Realtime for turn changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.speaking_turns;
