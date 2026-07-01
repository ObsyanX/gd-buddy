
CREATE OR REPLACE FUNCTION public.close_stale_sessions(_idle_minutes int DEFAULT 15)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  WITH last_activity AS (
    SELECT s.id,
           GREATEST(
             COALESCE((SELECT MAX(m.end_ts) FROM gd_messages m WHERE m.session_id = s.id), s.updated_at),
             s.updated_at,
             COALESCE(s.start_time, s.created_at)
           ) AS last_at
    FROM gd_sessions s
    WHERE s.status IN ('active','setup','paused')
  ),
  upd AS (
    UPDATE gd_sessions s
    SET status = 'completed',
        end_time = COALESCE(s.end_time, la.last_at, now()),
        updated_at = now()
    FROM last_activity la
    WHERE s.id = la.id
      AND la.last_at < (now() - make_interval(mins => _idle_minutes))
    RETURNING s.id
  )
  SELECT count(*)::int INTO v_count FROM upd;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_stale_sessions(int) TO authenticated, service_role;

SELECT public.close_stale_sessions(15);

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close_stale_gd_sessions') THEN
    PERFORM cron.unschedule('close_stale_gd_sessions');
  END IF;
  PERFORM cron.schedule(
    'close_stale_gd_sessions',
    '*/5 * * * *',
    'SELECT public.close_stale_sessions(15);'
  );
END $$;
