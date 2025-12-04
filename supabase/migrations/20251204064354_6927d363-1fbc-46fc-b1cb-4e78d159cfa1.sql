-- Fix profiles table: Only authenticated users can view profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Fix gd_messages: Only allow access to messages from user's own sessions
DROP POLICY IF EXISTS "Allow all access to messages" ON public.gd_messages;

CREATE POLICY "Users can view messages from own sessions" 
ON public.gd_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gd_sessions 
    WHERE gd_sessions.id = gd_messages.session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.user_id IS NULL)
  )
);

CREATE POLICY "Users can insert messages to own sessions" 
ON public.gd_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gd_sessions 
    WHERE gd_sessions.id = gd_messages.session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.user_id IS NULL)
  )
);

CREATE POLICY "Users can update messages in own sessions" 
ON public.gd_messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gd_sessions 
    WHERE gd_sessions.id = gd_messages.session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.user_id IS NULL)
  )
);

CREATE POLICY "Users can delete messages from own sessions" 
ON public.gd_messages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gd_sessions 
    WHERE gd_sessions.id = gd_messages.session_id 
    AND (gd_sessions.user_id = auth.uid() OR gd_sessions.user_id IS NULL)
  )
);