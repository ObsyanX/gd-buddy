-- Slice 6: Host migration RPC
-- Promotes a healthy participant to session host when the current host has
-- gone idle. Callable only by an authenticated participant of the session.

CREATE OR REPLACE FUNCTION public.migrate_session_host(
  _session_id uuid,
  _idle_seconds int DEFAULT 45
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current_host uuid;
  v_last_activity timestamptz;
  v_new_host uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT public.can_access_session(_session_id, v_uid) THEN
    RAISE EXCEPTION 'Not a participant of this session';
  END IF;

  SELECT host_user_id, last_activity_at
    INTO v_current_host, v_last_activity
    FROM public.gd_sessions
   WHERE id = _session_id
   FOR UPDATE;

  -- If current host is still active, refuse migration.
  IF v_current_host IS NOT NULL
     AND v_last_activity IS NOT NULL
     AND v_last_activity > now() - make_interval(secs => _idle_seconds) THEN
    RETURN jsonb_build_object('status','host_still_active','host',v_current_host);
  END IF;

  -- Pick the most recently active real participant (not the stale host).
  SELECT p.real_user_id
    INTO v_new_host
    FROM public.gd_participants p
   WHERE p.session_id = _session_id
     AND p.real_user_id IS NOT NULL
     AND p.real_user_id IS DISTINCT FROM v_current_host
   ORDER BY p.joined_at DESC NULLS LAST
   LIMIT 1;

  IF v_new_host IS NULL THEN
    RETURN jsonb_build_object('status','no_candidate');
  END IF;

  UPDATE public.gd_sessions
     SET host_user_id = v_new_host,
         last_activity_at = now(),
         updated_at = now()
   WHERE id = _session_id;

  INSERT INTO public.moderator_decisions(session_id, action, target_user_id, reason, confidence, evidence, applied)
  VALUES (_session_id, 'host_migrated', v_new_host,
          'Previous host idle beyond threshold', 1.0,
          jsonb_build_object('previous_host', v_current_host, 'idle_seconds', _idle_seconds), true);

  RETURN jsonb_build_object('status','migrated','new_host',v_new_host,'previous_host',v_current_host);
END;
$$;

GRANT EXECUTE ON FUNCTION public.migrate_session_host(uuid, int) TO authenticated;