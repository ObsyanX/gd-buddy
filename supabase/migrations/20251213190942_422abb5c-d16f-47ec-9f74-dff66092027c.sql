-- Fix RLS policies for multiplayer room joining
-- Allow authenticated users to find multiplayer sessions by room code (read-only for joining)

-- Drop the restrictive policy for sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.gd_sessions;
DROP POLICY IF EXISTS "Users can view multiplayer sessions they participate in" ON public.gd_sessions;

-- Create a policy that allows viewing own sessions OR multiplayer sessions with a room code
CREATE POLICY "Users can view their own or joinable sessions"
ON public.gd_sessions
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Own sessions
    user_id = auth.uid() OR
    host_user_id = auth.uid() OR
    -- Multiplayer sessions with a room code (for joining)
    (is_multiplayer = true AND room_code IS NOT NULL) OR
    -- Sessions where user is a participant
    EXISTS (
      SELECT 1 FROM public.gd_participants
      WHERE gd_participants.session_id = gd_sessions.id
      AND gd_participants.real_user_id = auth.uid()
    )
  )
);

-- Fix participant policies for joining rooms
DROP POLICY IF EXISTS "Users can view session participants" ON public.gd_participants;
DROP POLICY IF EXISTS "Users can view participants of their sessions" ON public.gd_participants;

-- Allow viewing participants of sessions user can access
CREATE POLICY "Users can view participants of accessible sessions"
ON public.gd_participants
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- User is a participant
    real_user_id = auth.uid() OR
    -- User can access the session
    EXISTS (
      SELECT 1 FROM public.gd_sessions
      WHERE gd_sessions.id = gd_participants.session_id
      AND (
        gd_sessions.user_id = auth.uid() OR
        gd_sessions.host_user_id = auth.uid() OR
        (gd_sessions.is_multiplayer = true AND gd_sessions.room_code IS NOT NULL)
      )
    )
  )
);

-- Allow users to insert themselves as participants to joinable sessions
DROP POLICY IF EXISTS "Users can create participants for their sessions" ON public.gd_participants;

CREATE POLICY "Users can join as participants"
ON public.gd_participants
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- User is creating their own participant entry
    real_user_id = auth.uid() OR
    -- Or it's an AI participant for a session they own
    (
      is_user = false AND
      EXISTS (
        SELECT 1 FROM public.gd_sessions
        WHERE gd_sessions.id = session_id
        AND (gd_sessions.user_id = auth.uid() OR gd_sessions.host_user_id = auth.uid())
      )
    )
  )
);