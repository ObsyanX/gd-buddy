-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view participants of accessible sessions" ON public.gd_participants;

-- Create a fixed policy using the security definer function
CREATE POLICY "Users can view participants of accessible sessions" 
ON public.gd_participants 
FOR SELECT 
USING (can_access_session(session_id, auth.uid()));