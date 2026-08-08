DROP POLICY IF EXISTS "Users can view accessible sessions" ON public.gd_sessions;

CREATE POLICY "Users can view accessible sessions"
ON public.gd_sessions
FOR SELECT
USING (
  (user_id = auth.uid())
  OR (host_user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.gd_participants p
    WHERE p.session_id = gd_sessions.id AND p.real_user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.find_session_by_code(_room_code text)
RETURNS TABLE (id uuid, status discussion_status, topic text, is_multiplayer boolean, room_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.status, s.topic, s.is_multiplayer, s.room_code
  FROM public.gd_sessions s
  WHERE auth.uid() IS NOT NULL
    AND s.is_multiplayer = true
    AND s.room_code IS NOT NULL
    AND upper(s.room_code) = upper(btrim(_room_code))
    AND s.status = ANY (ARRAY['setup'::discussion_status, 'active'::discussion_status, 'paused'::discussion_status])
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.find_session_by_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_session_by_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_session_by_code(text) TO authenticated;