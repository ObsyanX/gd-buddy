-- Defense in depth: email is never selectable by client roles.
REVOKE ALL (email) ON public.profiles FROM anon, authenticated;
GRANT INSERT (email), UPDATE (email) ON public.profiles TO authenticated;

-- Tighten the participant-visibility policy: exclude sessions that are merely
-- "joinable" by room code. Only genuine co-participants / hosts are visible,
-- and only for non-email columns (enforced by column grants above).
DROP POLICY IF EXISTS "Users can view profiles of session participants" ON public.profiles;

CREATE POLICY "Users can view own and co-participant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM public.gd_participants me
    JOIN public.gd_participants other ON other.session_id = me.session_id
    WHERE me.real_user_id = auth.uid()
      AND other.real_user_id = public.profiles.id
  )
  OR EXISTS (
    SELECT 1
    FROM public.gd_sessions s
    JOIN public.gd_participants me ON me.session_id = s.id
    WHERE me.real_user_id = auth.uid()
      AND public.profiles.id IN (s.user_id, s.host_user_id)
  )
);