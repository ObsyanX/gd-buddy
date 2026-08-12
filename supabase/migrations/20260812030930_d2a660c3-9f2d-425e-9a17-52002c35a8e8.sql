-- 1) Align UPDATE/DELETE policies with owns_session()
DROP POLICY IF EXISTS "Authenticated users can update messages in own sessions" ON public.gd_messages;
DROP POLICY IF EXISTS "Authenticated users can delete messages in own sessions" ON public.gd_messages;
CREATE POLICY "Session owners can update messages" ON public.gd_messages FOR UPDATE TO authenticated
  USING (public.owns_session(session_id, auth.uid())) WITH CHECK (public.owns_session(session_id, auth.uid()));
CREATE POLICY "Session owners can delete messages" ON public.gd_messages FOR DELETE TO authenticated
  USING (public.owns_session(session_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update participants in own sessions" ON public.gd_participants;
DROP POLICY IF EXISTS "Authenticated users can delete participants in own sessions" ON public.gd_participants;
CREATE POLICY "Session owners can update participants" ON public.gd_participants FOR UPDATE TO authenticated
  USING (public.owns_session(session_id, auth.uid()) OR real_user_id = auth.uid())
  WITH CHECK (public.owns_session(session_id, auth.uid()) OR real_user_id = auth.uid());
CREATE POLICY "Session owners can delete participants" ON public.gd_participants FOR DELETE TO authenticated
  USING (public.owns_session(session_id, auth.uid()) OR real_user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update metrics in own sessions" ON public.gd_metrics;
DROP POLICY IF EXISTS "Authenticated users can delete metrics in own sessions" ON public.gd_metrics;
CREATE POLICY "Session owners can update metrics" ON public.gd_metrics FOR UPDATE TO authenticated
  USING (public.owns_session(session_id, auth.uid())) WITH CHECK (public.owns_session(session_id, auth.uid()));
CREATE POLICY "Session owners can delete metrics" ON public.gd_metrics FOR DELETE TO authenticated
  USING (public.owns_session(session_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update feedback in own sessions" ON public.gd_feedback;
DROP POLICY IF EXISTS "Authenticated users can delete feedback in own sessions" ON public.gd_feedback;
CREATE POLICY "Session owners can update feedback" ON public.gd_feedback FOR UPDATE TO authenticated
  USING (public.owns_session(session_id, auth.uid())) WITH CHECK (public.owns_session(session_id, auth.uid()));
CREATE POLICY "Session owners can delete feedback" ON public.gd_feedback FOR DELETE TO authenticated
  USING (public.owns_session(session_id, auth.uid()));

-- also restrict the participants SELECT policy to authenticated (was role public)
DROP POLICY IF EXISTS "Users can view participants of accessible sessions" ON public.gd_participants;
CREATE POLICY "Users can view participants of accessible sessions" ON public.gd_participants FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

-- 2) profiles.email must not be readable by co-participants
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, display_name, avatar_url, created_at, updated_at, xp, level, bio)
  ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- own email + admin lookup via security definer RPCs
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_email() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_profile_emails(_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT p.id, p.email FROM public.profiles p WHERE p.id = ANY(_ids);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_profile_emails(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_profile_emails(uuid[]) TO authenticated;

-- 3) behaviour/health analytics: authenticated-only, participant scoped
REVOKE ALL ON public.participant_behaviour FROM anon;
REVOKE ALL ON public.discussion_health FROM anon;
GRANT SELECT ON public.participant_behaviour TO authenticated;
GRANT SELECT ON public.discussion_health TO authenticated;
GRANT ALL ON public.participant_behaviour TO service_role;
GRANT ALL ON public.discussion_health TO service_role;

DROP POLICY IF EXISTS "Participants read behaviour" ON public.participant_behaviour;
CREATE POLICY "Participants read behaviour" ON public.participant_behaviour FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));
DROP POLICY IF EXISTS "Participants read health" ON public.discussion_health;
CREATE POLICY "Participants read health" ON public.discussion_health FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

-- 4) drop duplicate user_roles self-select policy
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;