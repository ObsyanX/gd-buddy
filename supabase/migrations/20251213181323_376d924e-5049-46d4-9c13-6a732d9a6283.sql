-- Drop the overly permissive policy on gd_participants
DROP POLICY IF EXISTS "Allow all access to participants" ON public.gd_participants;

-- Add session-based restrictions for participants
CREATE POLICY "Users can view participants in own sessions"
ON public.gd_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gd_sessions 
    WHERE gd_sessions.id = gd_participants.session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.user_id IS NULL)
  )
);

CREATE POLICY "Users can insert participants in own sessions"
ON public.gd_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gd_sessions 
    WHERE gd_sessions.id = gd_participants.session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.user_id IS NULL)
  )
);

CREATE POLICY "Users can update participants in own sessions"
ON public.gd_participants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gd_sessions 
    WHERE gd_sessions.id = gd_participants.session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.user_id IS NULL)
  )
);

CREATE POLICY "Users can delete participants in own sessions"
ON public.gd_participants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gd_sessions 
    WHERE gd_sessions.id = gd_participants.session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.user_id IS NULL)
  )
);