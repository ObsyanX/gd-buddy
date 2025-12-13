-- Fix RLS policies for multiplayer: change RESTRICTIVE policies to PERMISSIVE
-- Drop conflicting restrictive policies and create unified permissive ones

-- ============ gd_sessions ============
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view own sessions" ON public.gd_sessions;
DROP POLICY IF EXISTS "Users can view their own or joinable sessions" ON public.gd_sessions;

-- Create a single permissive SELECT policy for sessions
CREATE POLICY "Users can view accessible sessions" 
ON public.gd_sessions 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR host_user_id = auth.uid() 
  OR (is_multiplayer = true AND room_code IS NOT NULL)
  OR EXISTS (
    SELECT 1 FROM gd_participants 
    WHERE gd_participants.session_id = gd_sessions.id 
    AND gd_participants.real_user_id = auth.uid()
  )
);

-- ============ gd_participants ============
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view participants in own sessions" ON public.gd_participants;
DROP POLICY IF EXISTS "Authenticated users can insert participants in own sessions" ON public.gd_participants;
DROP POLICY IF EXISTS "Users can view participants of accessible sessions" ON public.gd_participants;
DROP POLICY IF EXISTS "Users can join as participants" ON public.gd_participants;

-- Create unified permissive SELECT policy for participants
CREATE POLICY "Users can view participants of accessible sessions" 
ON public.gd_participants 
FOR SELECT 
TO authenticated
USING (
  real_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM gd_sessions 
    WHERE gd_sessions.id = gd_participants.session_id 
    AND (
      gd_sessions.user_id = auth.uid() 
      OR gd_sessions.host_user_id = auth.uid()
      OR (gd_sessions.is_multiplayer = true AND gd_sessions.room_code IS NOT NULL)
    )
  )
);

-- Create unified permissive INSERT policy for participants
CREATE POLICY "Users can join or add participants" 
ON public.gd_participants 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User can add themselves to any multiplayer session with room code
  (real_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM gd_sessions 
    WHERE gd_sessions.id = session_id 
    AND (
      gd_sessions.user_id = auth.uid()
      OR gd_sessions.host_user_id = auth.uid()
      OR (gd_sessions.is_multiplayer = true AND gd_sessions.room_code IS NOT NULL)
    )
  ))
  -- Or session owner/host can add AI participants
  OR (is_user = false AND EXISTS (
    SELECT 1 FROM gd_sessions 
    WHERE gd_sessions.id = session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.host_user_id = auth.uid())
  ))
);

-- ============ gd_messages ============
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view messages from own sessions" ON public.gd_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages to own sessions" ON public.gd_messages;

-- Create permissive SELECT policy for messages in accessible sessions
CREATE POLICY "Users can view messages in accessible sessions" 
ON public.gd_messages 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gd_sessions 
    WHERE gd_sessions.id = gd_messages.session_id 
    AND (
      gd_sessions.user_id = auth.uid() 
      OR gd_sessions.host_user_id = auth.uid()
      OR (gd_sessions.is_multiplayer = true AND gd_sessions.room_code IS NOT NULL AND EXISTS (
        SELECT 1 FROM gd_participants 
        WHERE gd_participants.session_id = gd_sessions.id 
        AND gd_participants.real_user_id = auth.uid()
      ))
    )
  )
);

-- Create permissive INSERT policy for messages - participants can send messages
CREATE POLICY "Participants can send messages" 
ON public.gd_messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gd_participants 
    WHERE gd_participants.id = participant_id 
    AND (
      gd_participants.real_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM gd_sessions 
        WHERE gd_sessions.id = gd_participants.session_id 
        AND (gd_sessions.user_id = auth.uid() OR gd_sessions.host_user_id = auth.uid())
      )
    )
  )
);

-- ============ gd_metrics ============
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view metrics from own sessions" ON public.gd_metrics;
DROP POLICY IF EXISTS "Authenticated users can insert metrics to own sessions" ON public.gd_metrics;

-- Create permissive SELECT for metrics
CREATE POLICY "Users can view metrics for accessible sessions" 
ON public.gd_metrics 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gd_sessions 
    WHERE gd_sessions.id = gd_metrics.session_id 
    AND (
      gd_sessions.user_id = auth.uid() 
      OR gd_sessions.host_user_id = auth.uid()
      OR (gd_sessions.is_multiplayer = true AND EXISTS (
        SELECT 1 FROM gd_participants 
        WHERE gd_participants.session_id = gd_sessions.id 
        AND gd_participants.real_user_id = auth.uid()
      ))
    )
  )
);

-- Create permissive INSERT for metrics
CREATE POLICY "Users can insert metrics for owned sessions" 
ON public.gd_metrics 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gd_sessions 
    WHERE gd_sessions.id = session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.host_user_id = auth.uid())
  )
);

-- ============ gd_feedback ============
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view feedback from own sessions" ON public.gd_feedback;
DROP POLICY IF EXISTS "Authenticated users can insert feedback to own sessions" ON public.gd_feedback;

-- Create permissive SELECT for feedback
CREATE POLICY "Users can view feedback for accessible sessions" 
ON public.gd_feedback 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gd_sessions 
    WHERE gd_sessions.id = gd_feedback.session_id 
    AND (
      gd_sessions.user_id = auth.uid() 
      OR gd_sessions.host_user_id = auth.uid()
      OR (gd_sessions.is_multiplayer = true AND EXISTS (
        SELECT 1 FROM gd_participants 
        WHERE gd_participants.session_id = gd_sessions.id 
        AND gd_participants.real_user_id = auth.uid()
      ))
    )
  )
);

-- Create permissive INSERT for feedback
CREATE POLICY "Users can insert feedback for owned sessions" 
ON public.gd_feedback 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gd_sessions 
    WHERE gd_sessions.id = session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.host_user_id = auth.uid())
  )
);