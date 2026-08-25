CREATE INDEX IF NOT EXISTS idx_gd_participants_real_user ON public.gd_participants (real_user_id) WHERE real_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gd_participants_user_session ON public.gd_participants (real_user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_gd_sessions_user ON public.gd_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_gd_sessions_host_user ON public.gd_sessions (host_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);

CREATE OR REPLACE FUNCTION public.visible_profile_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
  UNION
  SELECT other.real_user_id
    FROM gd_participants me
    JOIN gd_participants other ON other.session_id = me.session_id
   WHERE me.real_user_id = auth.uid() AND other.real_user_id IS NOT NULL
  UNION
  SELECT s.user_id FROM gd_sessions s
    JOIN gd_participants me ON me.session_id = s.id
   WHERE me.real_user_id = auth.uid() AND s.user_id IS NOT NULL
  UNION
  SELECT s.host_user_id FROM gd_sessions s
    JOIN gd_participants me ON me.session_id = s.id
   WHERE me.real_user_id = auth.uid() AND s.host_user_id IS NOT NULL
$$;

REVOKE EXECUTE ON FUNCTION public.visible_profile_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.visible_profile_ids() TO authenticated;

DROP POLICY IF EXISTS "Users can view own and co-participant profiles" ON public.profiles;
CREATE POLICY "Users can view own and co-participant profiles"
ON public.profiles FOR SELECT TO authenticated
USING (id IN (SELECT public.visible_profile_ids()));