-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a new session-based visibility policy
-- Users can view profiles of other users they share a session with
CREATE POLICY "Users can view profiles of session participants" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (
    -- Users can always view their own profile
    auth.uid() = id
    OR
    -- Users can view profiles of other participants in sessions they are part of
    id IN (
      SELECT p.real_user_id 
      FROM gd_participants p
      WHERE p.session_id IN (
        -- Sessions the current user participates in
        SELECT p2.session_id 
        FROM gd_participants p2 
        WHERE p2.real_user_id = auth.uid()
      )
      AND p.real_user_id IS NOT NULL
    )
    OR
    -- Users can view profiles of session owners/hosts for sessions they participate in
    id IN (
      SELECT s.user_id FROM gd_sessions s
      WHERE s.id IN (
        SELECT p3.session_id FROM gd_participants p3 WHERE p3.real_user_id = auth.uid()
      )
      AND s.user_id IS NOT NULL
      UNION
      SELECT s2.host_user_id FROM gd_sessions s2
      WHERE s2.id IN (
        SELECT p4.session_id FROM gd_participants p4 WHERE p4.real_user_id = auth.uid()
      )
      AND s2.host_user_id IS NOT NULL
    )
  );