ALTER TABLE public.speaking_turns ADD COLUMN IF NOT EXISTS slot_seconds integer NOT NULL DEFAULT 45;
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- mock_drives may belong to either cohort table (TPO dashboard uses public.cohorts)
ALTER TABLE public.mock_drives DROP CONSTRAINT IF EXISTS mock_drives_cohort_id_fkey;
COMMENT ON COLUMN public.mock_drives.cohort_id IS 'References public.cohorts.id (TPO batches) or legacy public.instructor_cohorts.id';

DROP POLICY IF EXISTS "instructors can create mock drives" ON public.mock_drives;
CREATE POLICY "instructors can create mock drives" ON public.mock_drives FOR INSERT TO authenticated
WITH CHECK (instructor_id = auth.uid() AND (public.is_cohort_owner(cohort_id, auth.uid()) OR public.is_instructor_cohort_owner(cohort_id, auth.uid())));
DROP POLICY IF EXISTS "instructors can update own mock drives" ON public.mock_drives;
CREATE POLICY "instructors can update own mock drives" ON public.mock_drives FOR UPDATE TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid() AND (public.is_cohort_owner(cohort_id, auth.uid()) OR public.is_instructor_cohort_owner(cohort_id, auth.uid())));
DROP POLICY IF EXISTS "batch members can view cohort mock drives" ON public.mock_drives;
CREATE POLICY "batch members can view cohort mock drives" ON public.mock_drives FOR SELECT TO authenticated
USING (public.is_cohort_member(cohort_id, auth.uid()));

-- Instructors read room events of sessions hosted by them (drive rooms) – already via owns_session.

-- Add a student to a batch by email (instructor only)
CREATE OR REPLACE FUNCTION public.instructor_add_member_by_email(_cohort_id uuid, _email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  IF NOT public.is_cohort_owner(_cohort_id, auth.uid()) THEN RETURN jsonb_build_object('status','forbidden'); END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF v_uid IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.cohort_members WHERE cohort_id=_cohort_id AND user_id=v_uid) THEN
    RETURN jsonb_build_object('status','already_member','user_id',v_uid);
  END IF;
  INSERT INTO public.cohort_members(cohort_id, user_id) VALUES (_cohort_id, v_uid);
  RETURN jsonb_build_object('status','added','user_id',v_uid);
END $$;
REVOKE ALL ON FUNCTION public.instructor_add_member_by_email(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.instructor_add_member_by_email(uuid, text) TO authenticated;

-- Join a batch by invite code (student)
CREATE OR REPLACE FUNCTION public.join_cohort_by_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_c uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('status','unauthenticated'); END IF;
  SELECT id INTO v_c FROM public.cohorts WHERE invite_code = trim(_code) AND is_active AND archived_at IS NULL LIMIT 1;
  IF v_c IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
  INSERT INTO public.cohort_members(cohort_id, user_id) SELECT v_c, auth.uid()
   WHERE NOT EXISTS (SELECT 1 FROM public.cohort_members WHERE cohort_id=v_c AND user_id=auth.uid());
  RETURN jsonb_build_object('status','joined','cohort_id',v_c);
END $$;
REVOKE ALL ON FUNCTION public.join_cohort_by_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_cohort_by_code(text) TO authenticated;

-- Saved results of batch students for their instructor (no live session needed)
CREATE OR REPLACE FUNCTION public.instructor_cohort_results(_cohort_id uuid)
RETURNS TABLE(user_id uuid, session_id uuid, created_at timestamptz, status text, topic text, is_multiplayer boolean,
  fluency_score int, content_score int, structure_score int, voice_score int, leadership_score int, teamwork_score int,
  filler_count int, total_words int, words_per_min numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.user_id, s.id, s.created_at, s.status::text, s.topic, s.is_multiplayer,
         m.fluency_score, m.content_score, m.structure_score, m.voice_score, m.leadership_score, m.teamwork_score,
         m.filler_count, m.total_words, m.words_per_min
    FROM public.gd_sessions s
    JOIN public.cohort_members cm ON cm.user_id = s.user_id AND cm.cohort_id = _cohort_id
    LEFT JOIN public.gd_metrics m ON m.session_id = s.id
   WHERE public.is_cohort_owner(_cohort_id, auth.uid())
  UNION ALL
  SELECT p.real_user_id, s.id, s.created_at, s.status::text, s.topic, s.is_multiplayer,
         NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL
    FROM public.gd_participants p
    JOIN public.gd_sessions s ON s.id = p.session_id AND s.user_id <> p.real_user_id
    JOIN public.cohort_members cm ON cm.user_id = p.real_user_id AND cm.cohort_id = _cohort_id
   WHERE public.is_cohort_owner(_cohort_id, auth.uid())
   ORDER BY 3 DESC
   LIMIT 5000
$$;
REVOKE ALL ON FUNCTION public.instructor_cohort_results(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.instructor_cohort_results(uuid) TO authenticated;

-- ===== Fair turn-taking: AI members queue like humans =====
CREATE OR REPLACE FUNCTION public._promote_next_turn(_session_id uuid, _last_holder uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_who uuid; v_slot int;
BEGIN
  WITH air AS (
    SELECT COALESCE(participant_id, user_id) AS who, COALESCE(sum(duration_ms),0) AS ms FROM public.speaking_turns
     WHERE session_id=_session_id AND status IN ('released','expired','yielded') GROUP BY 1
  ), nxt AS (
    SELECT t.id FROM public.speaking_turns t LEFT JOIN air a ON a.who = COALESCE(t.participant_id, t.user_id)
     WHERE t.session_id=_session_id AND t.status='pending'
     ORDER BY (COALESCE(t.participant_id, t.user_id) = _last_holder) ASC, t.priority DESC, COALESCE(a.ms,0) ASC, t.requested_at ASC
     LIMIT 1
  )
  UPDATE public.speaking_turns st SET status='active', granted_at=now() FROM nxt WHERE st.id=nxt.id
  RETURNING st.id, COALESCE(st.participant_id, st.user_id), st.slot_seconds INTO v_id, v_who, v_slot;
  UPDATE public.gd_sessions SET mic_lock_holder=v_who,
         mic_lock_expires_at=CASE WHEN v_who IS NOT NULL THEN now() + make_interval(secs => v_slot) END, last_activity_at=now()
   WHERE id=_session_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public._promote_next_turn(uuid, uuid) FROM public, anon, authenticated;

DROP FUNCTION IF EXISTS public.request_mic(uuid, text, text);
CREATE FUNCTION public.request_mic(_session_id uuid, _kind text DEFAULT 'human', _source text DEFAULT 'mic_press',
  _participant_id uuid DEFAULT NULL, _slot_seconds integer DEFAULT 45)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_who uuid; v_holder uuid; v_expires timestamptz; v_turn_id uuid; v_position int; v_status text;
  v_slot int := LEAST(GREATEST(COALESCE(_slot_seconds,45),15),180);
  v_prio int := CASE WHEN _kind = 'human' THEN 1 ELSE 0 END;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_access_session(_session_id, v_uid) THEN RAISE EXCEPTION 'Not a participant of this session'; END IF;
  IF _kind = 'ai' THEN
    IF _participant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.gd_participants WHERE id=_participant_id AND session_id=_session_id AND NOT COALESCE(is_user,false)) THEN
      RAISE EXCEPTION 'Unknown AI participant';
    END IF;
    v_who := _participant_id;
  ELSE
    v_who := v_uid;
    IF (SELECT count(*) FROM public.speaking_turns WHERE session_id=_session_id AND user_id=v_uid AND participant_kind='human' AND requested_at > now() - interval '10 seconds') >= 3 THEN
      RETURN jsonb_build_object('status','rate_limited');
    END IF;
  END IF;
  SELECT mic_lock_holder, mic_lock_expires_at INTO v_holder, v_expires FROM public.gd_sessions WHERE id=_session_id FOR UPDATE;
  IF v_holder = v_who AND v_expires > now() THEN
    RETURN jsonb_build_object('status','granted','turn_id',(SELECT id FROM public.speaking_turns WHERE session_id=_session_id AND status='active' LIMIT 1),'expires_at',v_expires,'slot_seconds',v_slot);
  END IF;
  -- enqueue (one pending request per speaker)
  SELECT id INTO v_turn_id FROM public.speaking_turns WHERE session_id=_session_id AND COALESCE(participant_id,user_id)=v_who AND status='pending' LIMIT 1;
  IF v_turn_id IS NULL THEN
    INSERT INTO public.speaking_turns(session_id,user_id,participant_id,participant_kind,source,status,priority,slot_seconds)
    VALUES (_session_id,v_uid,CASE WHEN _kind='ai' THEN _participant_id END,_kind,_source,'pending',v_prio,v_slot) RETURNING id INTO v_turn_id;
  END IF;
  -- expired holder: close it and pass the floor on fairly
  IF v_holder IS NOT NULL AND v_expires IS NOT NULL AND v_expires < now() THEN
    UPDATE public.speaking_turns SET status='expired', released_at=now(), duration_ms=EXTRACT(EPOCH FROM (now()-granted_at))::int*1000
     WHERE session_id=_session_id AND status='active';
    PERFORM public._promote_next_turn(_session_id, v_holder);
  ELSIF v_holder IS NULL THEN
    PERFORM public._promote_next_turn(_session_id, NULL);
  END IF;
  SELECT status INTO v_status FROM public.speaking_turns WHERE id=v_turn_id;
  IF v_status = 'active' THEN
    SELECT mic_lock_expires_at INTO v_expires FROM public.gd_sessions WHERE id=_session_id;
    RETURN jsonb_build_object('status','granted','turn_id',v_turn_id,'expires_at',v_expires,'slot_seconds',v_slot);
  END IF;
  SELECT count(*) INTO v_position FROM public.speaking_turns
   WHERE session_id=_session_id AND status='pending' AND (priority > v_prio OR (priority = v_prio AND requested_at <= (SELECT requested_at FROM public.speaking_turns WHERE id=v_turn_id)));
  RETURN jsonb_build_object('status','queued','turn_id',v_turn_id,'position',v_position,'slot_seconds',v_slot);
END $$;
REVOKE ALL ON FUNCTION public.request_mic(uuid, text, text, uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_mic(uuid, text, text, uuid, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.release_mic(uuid);
CREATE FUNCTION public.release_mic(_session_id uuid, _participant_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_who uuid; v_holder uuid; v_expires timestamptz; v_next uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_who := COALESCE(_participant_id, v_uid);
  SELECT mic_lock_holder, mic_lock_expires_at INTO v_holder, v_expires FROM public.gd_sessions WHERE id=_session_id FOR UPDATE;
  -- drop any pending request of the caller's speaker
  UPDATE public.speaking_turns SET status='yielded', released_at=now()
   WHERE session_id=_session_id AND status='pending' AND COALESCE(participant_id,user_id)=v_who
     AND (participant_id IS NULL OR public.can_access_session(_session_id, v_uid));
  IF v_holder IS DISTINCT FROM v_who AND NOT public.has_role(v_uid,'admin'::app_role)
     AND NOT (v_expires IS NOT NULL AND v_expires < now() AND public.can_access_session(_session_id, v_uid)) THEN
    RETURN jsonb_build_object('status','not_holder');
  END IF;
  IF _participant_id IS NOT NULL AND NOT public.can_access_session(_session_id, v_uid) THEN
    RETURN jsonb_build_object('status','not_holder');
  END IF;
  UPDATE public.speaking_turns SET status=CASE WHEN v_expires < now() THEN 'expired' ELSE 'released' END, released_at=now(),
         duration_ms=EXTRACT(EPOCH FROM (now()-granted_at))::int*1000
   WHERE session_id=_session_id AND status='active';
  v_next := public._promote_next_turn(_session_id, v_holder);
  RETURN jsonb_build_object('status','released','next_turn_id',v_next,
    'next_holder',(SELECT mic_lock_holder FROM public.gd_sessions WHERE id=_session_id));
END $$;
REVOKE ALL ON FUNCTION public.release_mic(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.release_mic(uuid, uuid) TO authenticated;