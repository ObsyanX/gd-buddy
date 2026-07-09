
-- Newsletter digest opt-in
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS digest_opt_in BOOLEAN NOT NULL DEFAULT true;

-- Per-ad revenue counter
ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS revenue_cents BIGINT NOT NULL DEFAULT 0;

-- Ad revenue events
CREATE TABLE IF NOT EXISTS public.ad_revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES public.advertisements(id) ON DELETE CASCADE,
  advertiser TEXT,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('impression','click','conversion','manual')),
  currency TEXT NOT NULL DEFAULT 'USD',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_revenue_events TO authenticated;
GRANT ALL ON public.ad_revenue_events TO service_role;
ALTER TABLE public.ad_revenue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and analysts read ad revenue" ON public.ad_revenue_events
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'analyst'::app_role)
  );
CREATE POLICY "Admins write ad revenue" ON public.ad_revenue_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX IF NOT EXISTS ad_revenue_events_ad_idx ON public.ad_revenue_events(ad_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.rollup_ad_revenue()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ad_id IS NOT NULL THEN
    UPDATE public.advertisements
       SET revenue_cents = revenue_cents + NEW.amount_cents
     WHERE id = NEW.ad_id;
  END IF;
  INSERT INTO public.analytics_daily(day, ad_revenue_cents)
    VALUES (date_trunc('day', NEW.occurred_at)::date, NEW.amount_cents)
    ON CONFLICT (day) DO UPDATE SET ad_revenue_cents = public.analytics_daily.ad_revenue_cents + EXCLUDED.ad_revenue_cents,
                                    updated_at = now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_rollup_ad_revenue ON public.ad_revenue_events;
CREATE TRIGGER trg_rollup_ad_revenue AFTER INSERT ON public.ad_revenue_events
  FOR EACH ROW EXECUTE FUNCTION public.rollup_ad_revenue();

-- Article translations
CREATE TABLE IF NOT EXISTS public.article_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body_markdown TEXT,
  body_html TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, locale)
);
GRANT SELECT ON public.article_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_translations TO authenticated;
GRANT ALL ON public.article_translations TO service_role;
ALTER TABLE public.article_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published translations" ON public.article_translations
  FOR SELECT USING (status = 'published');
CREATE POLICY "Staff read all translations" ON public.article_translations
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'editor'::app_role)
    OR public.has_role(auth.uid(),'analyst'::app_role)
  );
CREATE POLICY "Editors manage translations" ON public.article_translations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'editor'::app_role));

CREATE TRIGGER trg_article_translations_updated_at
  BEFORE UPDATE ON public.article_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Supplemental role policies
CREATE POLICY "Editors manage articles" ON public.articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'editor'::app_role));
CREATE POLICY "Analysts read articles" ON public.articles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'analyst'::app_role));

CREATE POLICY "Editors manage categories" ON public.article_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'editor'::app_role));

CREATE POLICY "Editors manage tags" ON public.article_tags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'editor'::app_role));

CREATE POLICY "Editors manage tag map" ON public.article_tag_map
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'editor'::app_role));

CREATE POLICY "Editors moderate comments" ON public.article_comments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'editor'::app_role));

CREATE POLICY "Analysts read ads" ON public.advertisements
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'analyst'::app_role));
CREATE POLICY "Analysts read campaigns" ON public.ad_campaigns
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'analyst'::app_role));
CREATE POLICY "Analysts read analytics" ON public.analytics_daily
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'analyst'::app_role));
CREATE POLICY "Analysts read page views" ON public.page_views
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'analyst'::app_role));
CREATE POLICY "Analysts read visitor sessions" ON public.visitor_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'analyst'::app_role));

-- Seed feature flags
INSERT INTO public.admin_settings(key, value) VALUES
  ('reports.digest_enabled', 'true'::jsonb),
  ('articles.i18n_enabled', 'true'::jsonb),
  ('roles.editor_analyst_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
