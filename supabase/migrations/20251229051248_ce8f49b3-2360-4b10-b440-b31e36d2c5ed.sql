-- Drop the buggy SELECT policy
DROP POLICY IF EXISTS "Users can view accessible sessions" ON public.gd_sessions;

-- Create corrected policy that allows:
-- 1. Owners to see their sessions
-- 2. Hosts to see their sessions  
-- 3. Existing participants to see joined sessions
-- 4. ANY authenticated user to see joinable multiplayer rooms (to allow joining)
CREATE POLICY "Users can view accessible sessions" 
ON public.gd_sessions 
FOR SELECT 
USING (
  -- Owner or host can always see
  (user_id = auth.uid()) OR 
  (host_user_id = auth.uid()) OR 
  -- Existing participant can see
  EXISTS (
    SELECT 1 FROM gd_participants p 
    WHERE p.session_id = gd_sessions.id 
    AND p.real_user_id = auth.uid()
  ) OR
  -- Any authenticated user can see joinable multiplayer rooms (to allow joining by code)
  (
    auth.uid() IS NOT NULL AND 
    is_multiplayer = true AND 
    room_code IS NOT NULL AND 
    status IN ('setup', 'active')
  )
);