
GRANT INSERT ON public.error_logs TO anon;

CREATE POLICY "Anon can insert auth error logs"
ON public.error_logs
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND error_source LIKE 'auth_%'
);
