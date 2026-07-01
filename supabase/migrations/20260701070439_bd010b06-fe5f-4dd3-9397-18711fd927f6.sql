
ALTER TABLE public.gd_sessions
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS gd_sessions_last_activity_idx
  ON public.gd_sessions (last_activity_at)
  WHERE status IN ('active','setup','paused');

CREATE OR REPLACE FUNCTION public.touch_session_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.gd_sessions
     SET last_activity_at = now()
   WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_session_last_activity ON public.gd_messages;
CREATE TRIGGER trg_touch_session_last_activity
AFTER INSERT ON public.gd_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_session_last_activity();

CREATE OR REPLACE FUNCTION public.sync_session_activity_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('active','setup') AND NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    NEW.last_activity_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_session_activity_on_update ON public.gd_sessions;
CREATE TRIGGER trg_sync_session_activity_on_update
BEFORE UPDATE ON public.gd_sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_session_activity_on_update();

CREATE OR REPLACE FUNCTION public.close_stale_sessions(_idle_minutes integer DEFAULT 15)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  WITH activity AS (
    SELECT s.id,
           GREATEST(
             s.last_activity_at,
             COALESCE((SELECT MAX(m.end_ts) FROM gd_messages m WHERE m.session_id = s.id), s.updated_at),
             s.updated_at,
             COALESCE(s.start_time, s.created_at)
           ) AS last_at
    FROM gd_sessions s
    WHERE s.status IN ('active','setup','paused')
  ),
  upd AS (
    UPDATE gd_sessions s
       SET status     = 'completed',
           end_time   = COALESCE(s.end_time, a.last_at, now()),
           updated_at = now()
      FROM activity a
     WHERE s.id = a.id
       AND a.last_at < (now() - make_interval(mins => _idle_minutes))
    RETURNING s.id
  )
  SELECT count(*)::int INTO v_count FROM upd;
  RETURN v_count;
END;
$$;

SELECT public.close_stale_sessions(15);
