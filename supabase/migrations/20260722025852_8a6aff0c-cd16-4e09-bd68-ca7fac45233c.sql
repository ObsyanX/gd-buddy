
-- 1) response_cache: remove blanket authenticated read
DROP POLICY IF EXISTS "Authenticated users can read cache" ON public.response_cache;

-- 2) profiles.email: revoke column-level SELECT so participant-visibility policy cannot leak it.
--    Owner apps can still read email via auth.users / auth.email().
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- 3) Tighten always-true INSERT policies
DROP POLICY IF EXISTS "anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "anyone can subscribe" ON public.newsletter_subscribers
  FOR INSERT
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

DROP POLICY IF EXISTS "Anyone can insert vitals" ON public.web_vitals_events;
CREATE POLICY "Anyone can insert vitals" ON public.web_vitals_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    metric IS NOT NULL
    AND length(metric) <= 32
    AND length(path) <= 2048
    AND value >= 0
  );

-- 4) Public storage listing on avatars: drop the broad SELECT policy.
--    The bucket is public=true so direct URLs still resolve via CDN, but
--    the storage API's list/select is no longer wide open.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- 5) SECURITY DEFINER function EXECUTE privileges — restrict to intended callers.
--    Public/anon-callable helpers used by public pages stay open. Everything
--    else is restricted to authenticated or removed from anon entirely, and
--    trigger-only functions are locked down.

-- Trigger-only functions: nobody should call these directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_admin_allowlist()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rollup_ad_revenue()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_session_last_activity()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_session_activity_on_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()       FROM PUBLIC, anon, authenticated;

-- Maintenance/cron-only helpers: service_role only.
REVOKE EXECUTE ON FUNCTION public.close_stale_sessions(integer)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_turns()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.migrate_session_host(uuid, integer) FROM PUBLIC, anon, authenticated;

-- Session-owner helpers: authenticated only.
REVOKE EXECUTE ON FUNCTION public.can_access_session(uuid, uuid)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_session(uuid, uuid)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_mic(uuid, text, text)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_mic(uuid)                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.export_user_data(uuid)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid)           FROM PUBLIC, anon;

-- Article like/share flow triggered by a signed-in user only.
REVOKE EXECUTE ON FUNCTION public.increment_article_like(text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_article_share(text)    FROM PUBLIC, anon;

-- Kept open to anon (public site features):
--   increment_article_view(text)  — public article view counter
--   related_articles(uuid, int)   — public "related articles" widget
--   get_feature_flag(text)        — public feature-flag read
--   is_joinable_session(uuid)     — join-by-room-code screen for guests
