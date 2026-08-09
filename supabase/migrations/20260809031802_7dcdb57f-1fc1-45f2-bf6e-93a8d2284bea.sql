CREATE OR REPLACE FUNCTION public.prune_telemetry_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb := '{}'::jsonb;
  n int;
BEGIN
  DELETE FROM public.web_vitals_events WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT; v := v || jsonb_build_object('web_vitals_events', n);

  DELETE FROM public.page_views WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS n = ROW_COUNT; v := v || jsonb_build_object('page_views', n);

  DELETE FROM public.visitor_sessions WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS n = ROW_COUNT; v := v || jsonb_build_object('visitor_sessions', n);

  DELETE FROM public.error_logs WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT; v := v || jsonb_build_object('error_logs', n);

  DELETE FROM public.perf_events WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT; v := v || jsonb_build_object('perf_events', n);

  DELETE FROM public.response_cache WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS n = ROW_COUNT; v := v || jsonb_build_object('response_cache', n);

  DELETE FROM public.ad_impressions WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS n = ROW_COUNT; v := v || jsonb_build_object('ad_impressions', n);

  DELETE FROM public.background_jobs WHERE status IN ('completed','failed') AND created_at < now() - interval '14 days';
  GET DIAGNOSTICS n = ROW_COUNT; v := v || jsonb_build_object('background_jobs', n);

  DELETE FROM public.pagespeed_reports WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS n = ROW_COUNT; v := v || jsonb_build_object('pagespeed_reports', n);

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_telemetry_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_telemetry_data() TO service_role;

SELECT cron.unschedule('prune-telemetry-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-telemetry-daily');

SELECT cron.schedule('prune-telemetry-daily', '30 3 * * *', $$SELECT public.prune_telemetry_data();$$);