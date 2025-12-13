-- Fix infinite recursion by using security definer function
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view accessible sessions" ON public.gd_sessions;
DROP POLICY IF EXISTS "Users can view participants of accessible sessions" ON public.gd_participants;
DROP POLICY IF EXISTS "Users can join or add participants" ON public.gd_participants;
DROP POLICY IF EXISTS "Users can view messages in accessible sessions" ON public.gd_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.gd_messages;
DROP POLICY IF EXISTS "Users can view metrics for accessible sessions" ON public.gd_metrics;
DROP POLICY IF EXISTS "Users can insert metrics for owned sessions" ON public.gd_metrics;
DROP POLICY IF EXISTS "Users can view feedback for accessible sessions" ON public.gd_feedback;
DROP POLICY IF EXISTS "Users can insert feedback for owned sessions" ON public.gd_feedback;

-- Create security definer function to check session access (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_access_session(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gd_sessions s
    WHERE s.id = _session_id
    AND (
      s.user_id = _user_id 
      OR s.host_user_id = _user_id
      OR (s.is_multiplayer = true AND s.room_code IS NOT NULL)
    )
  )
  OR EXISTS (
    SELECT 1 FROM gd_participants p
    WHERE p.session_id = _session_id
    AND p.real_user_id = _user_id
  )
$$;

-- Create security definer function to check session ownership
CREATE OR REPLACE FUNCTION public.owns_session(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gd_sessions s
    WHERE s.id = _session_id
    AND (s.user_id = _user_id OR s.host_user_id = _user_id)
  )
$$;

-- Create security definer function to check if session is joinable
CREATE OR REPLACE FUNCTION public.is_joinable_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gd_sessions s
    WHERE s.id = _session_id
    AND s.is_multiplayer = true
    AND s.room_code IS NOT NULL
  )
$$;

-- ============ gd_sessions ============
CREATE POLICY "Users can view accessible sessions" 
ON public.gd_sessions 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR host_user_id = auth.uid() 
  OR (is_multiplayer = true AND room_code IS NOT NULL)
);

-- ============ gd_participants ============
CREATE POLICY "Users can view participants of accessible sessions" 
ON public.gd_participants 
FOR SELECT 
TO authenticated
USING (
  real_user_id = auth.uid()
  OR public.owns_session(session_id, auth.uid())
  OR public.is_joinable_session(session_id)
);

CREATE POLICY "Users can join or add participants" 
ON public.gd_participants 
FOR INSERT 
TO authenticated
WITH CHECK (
  (real_user_id = auth.uid() AND (public.owns_session(session_id, auth.uid()) OR public.is_joinable_session(session_id)))
  OR (is_user = false AND public.owns_session(session_id, auth.uid()))
);

-- ============ gd_messages ============
CREATE POLICY "Users can view messages in accessible sessions" 
ON public.gd_messages 
FOR SELECT 
TO authenticated
USING (public.can_access_session(session_id, auth.uid()));

CREATE POLICY "Participants can send messages" 
ON public.gd_messages 
FOR INSERT 
TO authenticated
WITH CHECK (public.can_access_session(session_id, auth.uid()));

-- ============ gd_metrics ============
CREATE POLICY "Users can view metrics for accessible sessions" 
ON public.gd_metrics 
FOR SELECT 
TO authenticated
USING (public.can_access_session(session_id, auth.uid()));

CREATE POLICY "Users can insert metrics for owned sessions" 
ON public.gd_metrics 
FOR INSERT 
TO authenticated
WITH CHECK (public.owns_session(session_id, auth.uid()));

-- ============ gd_feedback ============
CREATE POLICY "Users can view feedback for accessible sessions" 
ON public.gd_feedback 
FOR SELECT 
TO authenticated
USING (public.can_access_session(session_id, auth.uid()));

CREATE POLICY "Users can insert feedback for owned sessions" 
ON public.gd_feedback 
FOR INSERT 
TO authenticated
WITH CHECK (public.owns_session(session_id, auth.uid()));