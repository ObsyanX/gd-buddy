
-- 1) Advertisements: drop public read of full row
DROP POLICY IF EXISTS "public read active ads" ON public.advertisements;
REVOKE SELECT ON public.advertisements FROM anon;

-- 2) Article likes: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "public read likes" ON public.article_likes;
CREATE POLICY "authenticated read likes"
  ON public.article_likes
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.article_likes FROM anon;
