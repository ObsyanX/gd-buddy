
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all sessions"
  ON public.gd_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
