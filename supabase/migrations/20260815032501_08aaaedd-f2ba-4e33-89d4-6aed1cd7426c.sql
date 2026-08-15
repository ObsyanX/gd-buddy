GRANT SELECT (id, display_name, avatar_url, created_at, updated_at, xp, level, bio) ON public.profiles TO authenticated;
GRANT INSERT (id, display_name, avatar_url, created_at, updated_at, xp, level, bio, email) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url, updated_at, xp, level, bio) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;