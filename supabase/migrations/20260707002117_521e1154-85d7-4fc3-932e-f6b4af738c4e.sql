
-- =====================================================================
-- SHARED
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =====================================================================
-- ANALYTICS
-- =====================================================================
CREATE TABLE public.visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_count INTEGER NOT NULL DEFAULT 1,
  entry_path TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visitor_sessions_visitor ON public.visitor_sessions(visitor_id);
CREATE INDEX idx_visitor_sessions_last_seen ON public.visitor_sessions(last_seen DESC);
GRANT SELECT ON public.visitor_sessions TO authenticated;
GRANT ALL ON public.visitor_sessions TO service_role;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read visitor_sessions" ON public.visitor_sessions FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_visitor_sessions_updated BEFORE UPDATE ON public.visitor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id UUID REFERENCES public.visitor_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  user_agent TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_page_views_created ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_path ON public.page_views(path);
CREATE INDEX idx_page_views_visitor ON public.page_views(visitor_id);
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read page_views" ON public.page_views FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  success BOOLEAN NOT NULL,
  reason TEXT,
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_events_created ON public.login_events(created_at DESC);
GRANT SELECT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read login_events" ON public.login_events FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.analytics_daily (
  day DATE PRIMARY KEY,
  signups INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  gd_sessions INTEGER NOT NULL DEFAULT 0,
  completed_sessions INTEGER NOT NULL DEFAULT 0,
  ad_impressions INTEGER NOT NULL DEFAULT 0,
  ad_clicks INTEGER NOT NULL DEFAULT 0,
  article_views INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analytics_daily TO authenticated;
GRANT ALL ON public.analytics_daily TO service_role;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read analytics_daily" ON public.analytics_daily FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- =====================================================================
-- ARTICLE CMS
-- =====================================================================
CREATE TABLE public.article_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.article_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.article_categories TO authenticated;
GRANT ALL ON public.article_categories TO service_role;
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read article_categories" ON public.article_categories FOR SELECT USING (true);
CREATE POLICY "admins write article_categories" ON public.article_categories FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_article_categories_updated BEFORE UPDATE ON public.article_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.article_tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.article_tags TO authenticated;
GRANT ALL ON public.article_tags TO service_role;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read article_tags" ON public.article_tags FOR SELECT USING (true);
CREATE POLICY "admins write article_tags" ON public.article_tags FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DO $$ BEGIN
  CREATE TYPE article_status AS ENUM ('draft','scheduled','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.article_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  featured_image TEXT,
  thumbnail TEXT,
  summary TEXT,
  body_markdown TEXT NOT NULL DEFAULT '',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  reading_time_min INTEGER NOT NULL DEFAULT 1,
  status article_status NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  related_ids UUID[] NOT NULL DEFAULT '{}',
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_articles_status_publish ON public.articles(status, publish_at DESC);
CREATE INDEX idx_articles_category ON public.articles(category_id);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published articles" ON public.articles FOR SELECT
  USING (status = 'published' AND (publish_at IS NULL OR publish_at <= now()));
CREATE POLICY "admins read all articles" ON public.articles FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins write articles" ON public.articles FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.article_tag_map (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.article_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);
GRANT SELECT ON public.article_tag_map TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.article_tag_map TO authenticated;
GRANT ALL ON public.article_tag_map TO service_role;
ALTER TABLE public.article_tag_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tag_map" ON public.article_tag_map FOR SELECT USING (true);
CREATE POLICY "admins write tag_map" ON public.article_tag_map FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_article_comments_article ON public.article_comments(article_id);
GRANT SELECT ON public.article_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.article_comments TO authenticated;
GRANT ALL ON public.article_comments TO service_role;
ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read approved comments" ON public.article_comments FOR SELECT USING (approved = true);
CREATE POLICY "users insert own comments" ON public.article_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own comments" ON public.article_comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own comments" ON public.article_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.article_likes (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.article_likes TO authenticated;
GRANT ALL ON public.article_likes TO service_role;
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own likes" ON public.article_likes FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public read likes" ON public.article_likes FOR SELECT USING (true);

-- =====================================================================
-- AD SYSTEM
-- =====================================================================
CREATE TABLE public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  advertiser TEXT,
  budget_cents INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_campaigns TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage campaigns" ON public.ad_campaigns FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_ad_campaigns_updated BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$ BEGIN
  CREATE TYPE ad_type AS ENUM ('banner','sidebar','native','card','inline','sticky_footer','popup','video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ad_rotation AS ENUM ('random','weighted','sequential','priority');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  advertiser TEXT,
  description TEXT,
  image_url TEXT,
  image_url_dark TEXT,
  destination_url TEXT NOT NULL,
  cta_text TEXT DEFAULT 'Learn more',
  ad_type ad_type NOT NULL DEFAULT 'banner',
  placements TEXT[] NOT NULL DEFAULT '{}',
  countries TEXT[] NOT NULL DEFAULT '{}',
  operating_systems TEXT[] NOT NULL DEFAULT '{}',
  browsers TEXT[] NOT NULL DEFAULT '{}',
  devices TEXT[] NOT NULL DEFAULT '{}',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 1,
  rotation ad_rotation NOT NULL DEFAULT 'weighted',
  max_views INTEGER,
  max_clicks INTEGER,
  frequency_cap_per_day INTEGER,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  tracking_enabled BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ads_status ON public.advertisements(status);
CREATE INDEX idx_ads_placements ON public.advertisements USING GIN (placements);
GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active ads" ON public.advertisements FOR SELECT
  USING (
    status = 'active'
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  );
CREATE POLICY "admins read all ads" ON public.advertisements FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins write ads" ON public.advertisements FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_ads_updated BEFORE UPDATE ON public.advertisements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  visitor_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  placement TEXT,
  country TEXT,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_impressions_ad ON public.ad_impressions(ad_id, created_at DESC);
GRANT SELECT ON public.ad_impressions TO authenticated;
GRANT ALL ON public.ad_impressions TO service_role;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read impressions" ON public.ad_impressions FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  visitor_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  placement TEXT,
  referrer TEXT,
  country TEXT,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_clicks_ad ON public.ad_clicks(ad_id, created_at DESC);
GRANT SELECT ON public.ad_clicks TO authenticated;
GRANT ALL ON public.ad_clicks TO service_role;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read clicks" ON public.ad_clicks FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- =====================================================================
-- NEWSLETTER
-- =====================================================================
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "admins read subscribers" ON public.newsletter_subscribers FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- =====================================================================
-- ADMIN SETTINGS
-- =====================================================================
CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.admin_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage settings" ON public.admin_settings FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- =====================================================================
-- SEED CATEGORIES
-- =====================================================================
INSERT INTO public.article_categories (name, slug, description) VALUES
  ('Interview Tips','interview-tips','Advice for cracking interviews.'),
  ('Group Discussion','group-discussion','Strategies for group discussions.'),
  ('HR Questions','hr-questions','Common HR interview questions.'),
  ('Technical Interviews','technical-interviews','Technical interview prep.'),
  ('Java','java','Java programming resources.'),
  ('React','react','React frontend resources.'),
  ('Node.js','nodejs','Node.js backend resources.'),
  ('System Design','system-design','System design essentials.'),
  ('Resume','resume','Resume writing tips.'),
  ('Aptitude','aptitude','Aptitude test prep.'),
  ('Communication','communication','Communication skills.'),
  ('Career','career','Career guidance.'),
  ('Placement','placement','Campus placement guidance.'),
  ('Behavioral','behavioral','Behavioral interview prep.'),
  ('Coding','coding','Coding interview practice.')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- HELPER: increment article view count
-- =====================================================================
CREATE OR REPLACE FUNCTION public.increment_article_view(_slug TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.articles SET view_count = view_count + 1 WHERE slug = _slug;
END; $$;
GRANT EXECUTE ON FUNCTION public.increment_article_view(TEXT) TO anon, authenticated;
