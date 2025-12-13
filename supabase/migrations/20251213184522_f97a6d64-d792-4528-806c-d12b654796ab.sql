-- Fix gd_sessions: Remove anonymous access
DROP POLICY IF EXISTS "Users can view own sessions" ON public.gd_sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.gd_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.gd_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.gd_sessions;

CREATE POLICY "Authenticated users can view own sessions" 
ON public.gd_sessions FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can create sessions" 
ON public.gd_sessions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own sessions" 
ON public.gd_sessions FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own sessions" 
ON public.gd_sessions FOR DELETE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix gd_messages: Remove anonymous access
DROP POLICY IF EXISTS "Users can view messages from own sessions" ON public.gd_messages;
DROP POLICY IF EXISTS "Users can insert messages to own sessions" ON public.gd_messages;
DROP POLICY IF EXISTS "Users can update messages in own sessions" ON public.gd_messages;
DROP POLICY IF EXISTS "Users can delete messages from own sessions" ON public.gd_messages;

CREATE POLICY "Authenticated users can view messages from own sessions" 
ON public.gd_messages FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_messages.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert messages to own sessions" 
ON public.gd_messages FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_messages.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can update messages in own sessions" 
ON public.gd_messages FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_messages.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can delete messages in own sessions" 
ON public.gd_messages FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_messages.session_id 
  AND gd_sessions.user_id = auth.uid()
));

-- Fix gd_participants: Remove anonymous access
DROP POLICY IF EXISTS "Users can view participants in own sessions" ON public.gd_participants;
DROP POLICY IF EXISTS "Users can insert participants in own sessions" ON public.gd_participants;
DROP POLICY IF EXISTS "Users can update participants in own sessions" ON public.gd_participants;
DROP POLICY IF EXISTS "Users can delete participants in own sessions" ON public.gd_participants;

CREATE POLICY "Authenticated users can view participants in own sessions" 
ON public.gd_participants FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_participants.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert participants in own sessions" 
ON public.gd_participants FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_participants.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can update participants in own sessions" 
ON public.gd_participants FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_participants.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can delete participants in own sessions" 
ON public.gd_participants FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_participants.session_id 
  AND gd_sessions.user_id = auth.uid()
));

-- Fix gd_metrics: Replace permissive policy with session-based access
DROP POLICY IF EXISTS "Allow all access to metrics" ON public.gd_metrics;

CREATE POLICY "Authenticated users can view metrics from own sessions" 
ON public.gd_metrics FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_metrics.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert metrics to own sessions" 
ON public.gd_metrics FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_metrics.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can update metrics in own sessions" 
ON public.gd_metrics FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_metrics.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can delete metrics in own sessions" 
ON public.gd_metrics FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_metrics.session_id 
  AND gd_sessions.user_id = auth.uid()
));

-- Fix gd_feedback: Replace permissive policy with session-based access
DROP POLICY IF EXISTS "Allow all access to feedback" ON public.gd_feedback;

CREATE POLICY "Authenticated users can view feedback from own sessions" 
ON public.gd_feedback FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_feedback.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert feedback to own sessions" 
ON public.gd_feedback FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_feedback.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can update feedback in own sessions" 
ON public.gd_feedback FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_feedback.session_id 
  AND gd_sessions.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can delete feedback in own sessions" 
ON public.gd_feedback FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM gd_sessions 
  WHERE gd_sessions.id = gd_feedback.session_id 
  AND gd_sessions.user_id = auth.uid()
));