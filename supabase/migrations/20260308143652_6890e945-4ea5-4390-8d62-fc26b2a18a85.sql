
-- Fix permissive INSERT policy on response_cache
DROP POLICY "Authenticated users can insert cache" ON public.response_cache;

-- Only allow service role or edge functions to insert cache via admin policy
CREATE POLICY "Admins can manage cache" ON public.response_cache
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
