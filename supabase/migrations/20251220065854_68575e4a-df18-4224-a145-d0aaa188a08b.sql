-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can join or add participants" ON public.gd_participants;

-- Create a fixed policy that allows session owners to add any participants
CREATE POLICY "Users can join or add participants" 
ON public.gd_participants 
FOR INSERT 
WITH CHECK (
  -- Session owner can add any participant (user or AI)
  owns_session(session_id, auth.uid())
  -- OR user can join a joinable multiplayer session as themselves
  OR ((real_user_id = auth.uid()) AND is_joinable_session(session_id))
);