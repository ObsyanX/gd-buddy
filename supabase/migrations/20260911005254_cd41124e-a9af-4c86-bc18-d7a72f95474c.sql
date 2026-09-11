DROP POLICY IF EXISTS "Users can insert metrics for owned sessions" ON public.gd_metrics;
CREATE POLICY "Participants can insert metrics for accessible sessions"
ON public.gd_metrics FOR INSERT TO authenticated
WITH CHECK (public.can_access_session(session_id, auth.uid()));

DROP POLICY IF EXISTS "Users can join or add participants" ON public.gd_participants;
CREATE POLICY "Users can join or add participants"
ON public.gd_participants FOR INSERT TO authenticated
WITH CHECK (
  ((real_user_id IS NULL) OR (real_user_id = auth.uid()))
  AND (
    public.owns_session(session_id, auth.uid())
    OR public.can_access_session(session_id, auth.uid())
    OR ((real_user_id = auth.uid()) AND public.is_joinable_session(session_id))
    OR ((real_user_id IS NULL) AND public.is_joinable_session(session_id))
  )
);