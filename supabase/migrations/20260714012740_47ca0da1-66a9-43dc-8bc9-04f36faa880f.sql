
-- Real User Monitoring events (LCP/INP/CLS with AdSense state)
CREATE TABLE public.web_vitals_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT,
  user_id UUID,
  path TEXT NOT NULL DEFAULT '/',
  metric TEXT NOT NULL,           -- 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB'
  value DOUBLE PRECISION NOT NULL,
  rating TEXT,                    -- 'good' | 'needs-improvement' | 'poor'
  device TEXT,                    -- 'mobile' | 'desktop' | 'tablet'
  adsense_loaded BOOLEAN NOT NULL DEFAULT false,
  navigation_type TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.web_vitals_events TO anon;
GRANT SELECT, INSERT ON public.web_vitals_events TO authenticated;
GRANT ALL ON public.web_vitals_events TO service_role;
ALTER TABLE public.web_vitals_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert vitals"
  ON public.web_vitals_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Admins read vitals"
  ON public.web_vitals_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'analyst'::app_role));
CREATE INDEX idx_wv_created ON public.web_vitals_events (created_at DESC);
CREATE INDEX idx_wv_metric_device ON public.web_vitals_events (metric, device, created_at DESC);

-- PageSpeed Insights reports
CREATE TABLE public.pagespeed_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  strategy TEXT NOT NULL,        -- 'mobile' | 'desktop'
  performance_score DOUBLE PRECISION,
  lcp_ms DOUBLE PRECISION,
  inp_ms DOUBLE PRECISION,
  cls DOUBLE PRECISION,
  fcp_ms DOUBLE PRECISION,
  tbt_ms DOUBLE PRECISION,
  ttfb_ms DOUBLE PRECISION,
  si_ms DOUBLE PRECISION,
  raw JSONB,
  source TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'cron'
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pagespeed_reports TO authenticated;
GRANT ALL ON public.pagespeed_reports TO service_role;
ALTER TABLE public.pagespeed_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read pagespeed"
  ON public.pagespeed_reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'analyst'::app_role));
CREATE INDEX idx_ps_created ON public.pagespeed_reports (strategy, created_at DESC);
