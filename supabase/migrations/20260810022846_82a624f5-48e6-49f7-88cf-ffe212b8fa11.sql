
-- 1. Sampling calibration columns on telemetry table
ALTER TABLE public.web_vitals_events
  ADD COLUMN IF NOT EXISTS in_sample boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sample_rate numeric NOT NULL DEFAULT 1;

-- 2. Prune run history
CREATE TABLE IF NOT EXISTS public.telemetry_prune_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  dry_run boolean NOT NULL DEFAULT false,
  skipped boolean NOT NULL DEFAULT false,
  triggered_by text NOT NULL DEFAULT 'cron',
  affected jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_rows integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.telemetry_prune_runs TO authenticated;
GRANT ALL ON public.telemetry_prune_runs TO service_role;
ALTER TABLE public.telemetry_prune_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read prune runs" ON public.telemetry_prune_runs;
CREATE POLICY "Admins read prune runs" ON public.telemetry_prune_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. RUM sampling accuracy checks
CREATE TABLE IF NOT EXISTS public.rum_sampling_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  metric text NOT NULL,
  n_all integer NOT NULL DEFAULT 0,
  n_sampled integer NOT NULL DEFAULT 0,
  p75_all numeric,
  p75_sampled numeric,
  delta_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rum_sampling_checks TO authenticated;
GRANT ALL ON public.rum_sampling_checks TO service_role;
ALTER TABLE public.rum_sampling_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read sampling checks" ON public.rum_sampling_checks;
CREATE POLICY "Admins read sampling checks" ON public.rum_sampling_checks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Safe prune with allowlist + dry run + logging
CREATE OR REPLACE FUNCTION public.prune_telemetry_data(_dry_run boolean DEFAULT NULL, _triggered_by text DEFAULT 'cron')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- HARD ALLOWLIST: telemetry-only. Nothing else may ever be deleted here.
  allowlist CONSTANT text[] := ARRAY[
    'web_vitals_events','page_views','visitor_sessions','error_logs',
    'perf_events','response_cache','ad_impressions','background_jobs','pagespeed_reports'
  ];
  -- Tables that must NEVER appear in the allowlist (defense in depth).
  forbidden CONSTANT text[] := ARRAY[
    'profiles','user_roles','gd_sessions','gd_messages','gd_participants','gd_metrics',
    'user_feedback','session_scores','session_notes','articles','article_comments',
    'notifications','login_events','audit_events','newsletter_subscribers','custom_personas'
  ];
  cfg record;
  is_dry boolean;
  enabled boolean := true;
  t0 timestamptz := clock_timestamp();
  run_id uuid;
  affected jsonb := '{}'::jsonb;
  total int := 0;
  n int;
  tbl text;
BEGIN
  -- Safety: allowlist may not intersect protected tables.
  IF EXISTS (SELECT 1 FROM unnest(allowlist) a WHERE a = ANY(forbidden)) THEN
    RAISE EXCEPTION 'prune_telemetry_data: allowlist contains a protected table';
  END IF;
  -- Safety: every allowlisted table must exist in public schema.
  FOREACH tbl IN ARRAY allowlist LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      RAISE EXCEPTION 'prune_telemetry_data: unknown table %', tbl;
    END IF;
  END LOOP;

  -- Runtime feature flags (admin_settings)
  SELECT (SELECT value FROM public.admin_settings WHERE key = 'telemetry.prune_enabled') AS en,
         (SELECT value FROM public.admin_settings WHERE key = 'telemetry.prune_dry_run') AS dry
    INTO cfg;
  IF cfg.en IS NOT NULL AND jsonb_typeof(cfg.en) = 'boolean' THEN
    enabled := (cfg.en)::text::boolean;
  END IF;
  is_dry := COALESCE(_dry_run,
                     CASE WHEN cfg.dry IS NOT NULL AND jsonb_typeof(cfg.dry) = 'boolean'
                          THEN (cfg.dry)::text::boolean ELSE false END);

  IF NOT enabled AND COALESCE(_dry_run, false) = false THEN
    INSERT INTO public.telemetry_prune_runs(dry_run, skipped, triggered_by, finished_at, duration_ms)
    VALUES (is_dry, true, _triggered_by, now(), 0)
    RETURNING id INTO run_id;
    RETURN jsonb_build_object('run_id', run_id, 'skipped', true, 'reason', 'telemetry.prune_enabled is false');
  END IF;

  INSERT INTO public.telemetry_prune_runs(dry_run, triggered_by)
  VALUES (is_dry, _triggered_by) RETURNING id INTO run_id;

  IF is_dry THEN
    SELECT count(*) INTO n FROM public.web_vitals_events WHERE created_at < now() - interval '30 days';
    affected := affected || jsonb_build_object('web_vitals_events', n); total := total + n;
    SELECT count(*) INTO n FROM public.page_views WHERE created_at < now() - interval '90 days';
    affected := affected || jsonb_build_object('page_views', n); total := total + n;
    SELECT count(*) INTO n FROM public.visitor_sessions WHERE created_at < now() - interval '90 days';
    affected := affected || jsonb_build_object('visitor_sessions', n); total := total + n;
    SELECT count(*) INTO n FROM public.error_logs WHERE created_at < now() - interval '30 days';
    affected := affected || jsonb_build_object('error_logs', n); total := total + n;
    SELECT count(*) INTO n FROM public.perf_events WHERE created_at < now() - interval '30 days';
    affected := affected || jsonb_build_object('perf_events', n); total := total + n;
    SELECT count(*) INTO n FROM public.response_cache WHERE created_at < now() - interval '7 days';
    affected := affected || jsonb_build_object('response_cache', n); total := total + n;
    SELECT count(*) INTO n FROM public.ad_impressions WHERE created_at < now() - interval '90 days';
    affected := affected || jsonb_build_object('ad_impressions', n); total := total + n;
    SELECT count(*) INTO n FROM public.background_jobs WHERE status IN ('completed','failed') AND created_at < now() - interval '14 days';
    affected := affected || jsonb_build_object('background_jobs', n); total := total + n;
    SELECT count(*) INTO n FROM public.pagespeed_reports WHERE created_at < now() - interval '90 days';
    affected := affected || jsonb_build_object('pagespeed_reports', n); total := total + n;
  ELSE
    DELETE FROM public.web_vitals_events WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('web_vitals_events', n); total := total + n;
    DELETE FROM public.page_views WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('page_views', n); total := total + n;
    DELETE FROM public.visitor_sessions WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('visitor_sessions', n); total := total + n;
    DELETE FROM public.error_logs WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('error_logs', n); total := total + n;
    DELETE FROM public.perf_events WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('perf_events', n); total := total + n;
    DELETE FROM public.response_cache WHERE created_at < now() - interval '7 days';
    GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('response_cache', n); total := total + n;
    DELETE FROM public.ad_impressions WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('ad_impressions', n); total := total + n;
    DELETE FROM public.background_jobs WHERE status IN ('completed','failed') AND created_at < now() - interval '14 days';
    GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('background_jobs', n); total := total + n;
    DELETE FROM public.pagespeed_reports WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('pagespeed_reports', n); total := total + n;
  END IF;

  UPDATE public.telemetry_prune_runs
     SET finished_at = now(),
         duration_ms = (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
         affected = affected,
         total_rows = total
   WHERE id = run_id;

  RETURN jsonb_build_object('run_id', run_id, 'dry_run', is_dry, 'total_rows', total, 'affected', affected);
EXCEPTION WHEN OTHERS THEN
  UPDATE public.telemetry_prune_runs
     SET finished_at = now(),
         duration_ms = (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
         error_message = SQLERRM
   WHERE id = run_id;
  RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.prune_telemetry_data(boolean, text) FROM PUBLIC, anon;

-- Admin-callable dry run wrapper
CREATE OR REPLACE FUNCTION public.telemetry_prune_dry_run()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN public.prune_telemetry_data(true, 'admin_dry_run');
END;
$function$;
REVOKE ALL ON FUNCTION public.telemetry_prune_dry_run() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telemetry_prune_dry_run() TO authenticated;

-- 5. Telemetry volume snapshot (admin only)
CREATE OR REPLACE FUNCTION public.telemetry_table_volumes()
RETURNS TABLE(table_name text, row_estimate bigint, total_bytes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT c.relname::text,
         GREATEST(c.reltuples, 0)::bigint,
         pg_total_relation_size(c.oid)::bigint
    FROM pg_class c
    JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
   WHERE nsp.nspname = 'public'
     AND c.relname = ANY (ARRAY['web_vitals_events','page_views','visitor_sessions','error_logs',
                                'perf_events','response_cache','ad_impressions','background_jobs','pagespeed_reports'])
   ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$function$;
REVOKE ALL ON FUNCTION public.telemetry_table_volumes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telemetry_table_volumes() TO authenticated;

-- 6. Sampled vs unsampled comparison
CREATE OR REPLACE FUNCTION public.run_rum_sampling_check(_hours integer DEFAULT 168)
RETURNS SETOF public.rum_sampling_checks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ws timestamptz := now() - make_interval(hours => GREATEST(_hours, 1));
  we timestamptz := now();
BEGIN
  RETURN QUERY
  WITH agg AS (
    SELECT metric,
           count(*)::int AS n_all,
           count(*) FILTER (WHERE in_sample)::int AS n_sampled,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY value)::numeric AS p75_all,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY value) FILTER (WHERE in_sample)::numeric AS p75_sampled
      FROM public.web_vitals_events
     WHERE created_at >= ws AND created_at <= we
     GROUP BY metric
  )
  INSERT INTO public.rum_sampling_checks(window_start, window_end, metric, n_all, n_sampled, p75_all, p75_sampled, delta_pct)
  SELECT ws, we, metric, n_all, n_sampled, p75_all, p75_sampled,
         CASE WHEN p75_all IS NULL OR p75_all = 0 OR p75_sampled IS NULL THEN NULL
              ELSE round(((p75_sampled - p75_all) / p75_all) * 100, 2) END
    FROM agg
  RETURNING *;
END;
$function$;
REVOKE ALL ON FUNCTION public.run_rum_sampling_check(integer) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.admin_run_rum_sampling_check(_hours integer DEFAULT 168)
RETURNS SETOF public.rum_sampling_checks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.run_rum_sampling_check(_hours);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_run_rum_sampling_check(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_run_rum_sampling_check(integer) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_web_vitals_created_metric ON public.web_vitals_events (created_at, metric);
CREATE INDEX IF NOT EXISTS idx_prune_runs_started ON public.telemetry_prune_runs (started_at DESC);
