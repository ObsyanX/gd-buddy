
-- Phase 2 migration: revisions, moderation, ad depth, conversions, feature flags helper

-- 1) Article revisions
CREATE TABLE public.article_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  editor_id uuid,
  title text,
  body_markdown text,
  body_json jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_revisions TO authenticated;
GRANT ALL ON public.article_revisions TO service_role;
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage revisions" ON public.article_revisions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX ON public.article_revisions(article_id, created_at DESC);

-- 2) Articles: rich text json + engagement columns
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS body_json jsonb,
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS editor_mode text NOT NULL DEFAULT 'markdown' CHECK (editor_mode IN ('markdown','rich'));

-- 3) Article comments: moderation status + spam flag
ALTER TABLE public.article_comments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','spam','deleted')),
  ADD COLUMN IF NOT EXISTS moderated_by uuid,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.article_comments(id) ON DELETE CASCADE;
UPDATE public.article_comments SET status='approved' WHERE approved = true AND status='pending';
CREATE INDEX IF NOT EXISTS idx_article_comments_status ON public.article_comments(status);

-- 4) Advertisements: video/media, refresh, spend caps, A/B group
ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video','html')),
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_poster text,
  ADD COLUMN IF NOT EXISTS html_body text,
  ADD COLUMN IF NOT EXISTS refresh_ms integer,
  ADD COLUMN IF NOT EXISTS daily_budget_cents integer,
  ADD COLUMN IF NOT EXISTS lifetime_budget_cents integer,
  ADD COLUMN IF NOT EXISTS spend_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpc_cents integer,
  ADD COLUMN IF NOT EXISTS cpm_cents integer,
  ADD COLUMN IF NOT EXISTS experiment_group text,
  ADD COLUMN IF NOT EXISTS auto_paused boolean NOT NULL DEFAULT false;

-- 5) Ad conversions (affiliate revenue)
CREATE TABLE public.ad_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  visitor_id text,
  user_id uuid,
  revenue_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  source text,
  postback_ref text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_conversions TO authenticated;
GRANT ALL ON public.ad_conversions TO service_role;
ALTER TABLE public.ad_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read conversions" ON public.ad_conversions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX ON public.ad_conversions(ad_id, created_at DESC);

-- 6) Analytics daily: add ad + revenue columns if not present
ALTER TABLE public.analytics_daily
  ADD COLUMN IF NOT EXISTS ad_impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ad_clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ad_revenue_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_revenue_cents integer NOT NULL DEFAULT 0;

-- 7) Newsletter: double opt-in tokens + unsubscribe
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS confirm_token text,
  ADD COLUMN IF NOT EXISTS unsubscribe_token text,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- 8) Feature flag helper function
CREATE OR REPLACE FUNCTION public.get_feature_flag(_key text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT value FROM public.admin_settings WHERE key = _key $$;

-- 9) Article increment helpers for likes/shares
CREATE OR REPLACE FUNCTION public.increment_article_like(_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN UPDATE public.articles SET like_count = like_count + 1 WHERE slug = _slug; END; $$;

CREATE OR REPLACE FUNCTION public.increment_article_share(_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN UPDATE public.articles SET share_count = share_count + 1 WHERE slug = _slug; END; $$;

-- 10) Related articles by shared tags/category
CREATE OR REPLACE FUNCTION public.related_articles(_article_id uuid, _limit int DEFAULT 4)
RETURNS SETOF public.articles LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH base AS (SELECT category_id FROM public.articles WHERE id = _article_id),
       my_tags AS (SELECT tag_id FROM public.article_tag_map WHERE article_id = _article_id)
  SELECT a.* FROM public.articles a
  LEFT JOIN public.article_tag_map m ON m.article_id = a.id AND m.tag_id IN (SELECT tag_id FROM my_tags)
  WHERE a.id <> _article_id
    AND a.status = 'published'
    AND (a.publish_at IS NULL OR a.publish_at <= now())
  GROUP BY a.id
  ORDER BY (COUNT(m.tag_id) + CASE WHEN a.category_id = (SELECT category_id FROM base) THEN 2 ELSE 0 END) DESC,
           a.publish_at DESC NULLS LAST
  LIMIT _limit
$$;

-- 11) Public read policy for comments must respect status='approved'
DROP POLICY IF EXISTS "public read approved comments" ON public.article_comments;
CREATE POLICY "public read approved comments" ON public.article_comments FOR SELECT
  USING (status = 'approved');
