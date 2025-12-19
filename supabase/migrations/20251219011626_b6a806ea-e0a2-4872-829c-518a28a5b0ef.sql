-- Fix PUBLIC_DATA_EXPOSURE: Update can_access_session to require participant membership
-- Instead of allowing anyone with room code to access, require explicit participation

-- Drop and recreate the function with stricter access control
CREATE OR REPLACE FUNCTION public.can_access_session(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- User can access if they own the session (creator or host)
  SELECT EXISTS (
    SELECT 1 FROM gd_sessions s
    WHERE s.id = _session_id
    AND (s.user_id = _user_id OR s.host_user_id = _user_id)
  )
  -- OR if they are an explicit participant in the session
  OR EXISTS (
    SELECT 1 FROM gd_participants p
    WHERE p.session_id = _session_id
    AND p.real_user_id = _user_id
  )
$$;

-- Update is_joinable_session to be more explicit about what "joinable" means
-- This now checks if the session is a multiplayer session with a room code AND is in setup/active status
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
    AND s.status IN ('setup', 'active')
  )
$$;

-- Update the gd_sessions SELECT policy to be more restrictive
-- Users can only view sessions they own, host, or are participants in
DROP POLICY IF EXISTS "Users can view accessible sessions" ON public.gd_sessions;

CREATE POLICY "Users can view accessible sessions" 
ON public.gd_sessions 
FOR SELECT 
USING (
  (user_id = auth.uid()) 
  OR (host_user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM gd_participants p 
    WHERE p.session_id = id 
    AND p.real_user_id = auth.uid()
  )
);

-- Update gd_participants INSERT policy to allow initial join via room code
-- But subsequent access requires participant membership
DROP POLICY IF EXISTS "Users can join or add participants" ON public.gd_participants;

CREATE POLICY "Users can join or add participants" 
ON public.gd_participants 
FOR INSERT 
WITH CHECK (
  -- User can add themselves as participant if session is joinable (room code exists)
  (
    real_user_id = auth.uid() 
    AND is_joinable_session(session_id)
  )
  -- OR session owner can add AI participants (is_user = false)
  OR (
    is_user = false 
    AND owns_session(session_id, auth.uid())
  )
);

-- Update gd_participants SELECT policy - users can view participants of sessions they're in
DROP POLICY IF EXISTS "Users can view participants of accessible sessions" ON public.gd_participants;

CREATE POLICY "Users can view participants of accessible sessions" 
ON public.gd_participants 
FOR SELECT 
USING (
  -- Can see own participant record
  real_user_id = auth.uid()
  -- OR owns the session
  OR owns_session(session_id, auth.uid())
  -- OR is a participant in the session (already joined)
  OR EXISTS (
    SELECT 1 FROM gd_participants p2
    WHERE p2.session_id = session_id
    AND p2.real_user_id = auth.uid()
  )
);