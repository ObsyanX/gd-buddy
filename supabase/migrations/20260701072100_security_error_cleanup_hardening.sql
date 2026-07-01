-- Final hardening for active HIGH findings shown in Admin.

DROP POLICY IF EXISTS "Admins can delete all error logs" ON public.error_logs;
CREATE POLICY "Admins can delete all error logs" ON public.error_logs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DELETE FROM public.error_logs
WHERE error_message ILIKE '%Cannot close a closed AudioContext%'
   OR error_message ILIKE '%Cannot access ''recalculateMetrics'' before initialization%'
   OR error_message ILIKE '%Should have a queue. This is likely a bug in React%';

DROP POLICY IF EXISTS "Users can view own drills" ON public.skill_drills;
DROP POLICY IF EXISTS "Authenticated users can create drills" ON public.skill_drills;
DROP POLICY IF EXISTS "Users can update own drills" ON public.skill_drills;

CREATE POLICY "Users can view own drills" ON public.skill_drills
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own drills" ON public.skill_drills
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can update own drills" ON public.skill_drills
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

REVOKE INSERT, UPDATE, DELETE ON public.user_achievements FROM authenticated;
DROP POLICY IF EXISTS "Users insert own achievements" ON public.user_achievements;

CREATE OR REPLACE FUNCTION public.award_user_achievement(_user_id uuid, _code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ach record;
BEGIN
  SELECT id, xp_reward INTO ach FROM public.achievements WHERE code = _code;
  IF ach.id IS NULL THEN RETURN; END IF;

  INSERT INTO public.user_achievements(user_id, achievement_id)
  VALUES (_user_id, ach.id)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
     SET xp = COALESCE(xp, 0) + COALESCE(ach.xp_reward, 0),
         level = GREATEST(1, FLOOR((COALESCE(xp, 0) + COALESCE(ach.xp_reward, 0)) / 500) + 1),
         updated_at = now()
   WHERE id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_user_achievement(uuid, text) TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.user_rankings FROM authenticated;
DROP POLICY IF EXISTS "Users can insert own ranking" ON public.user_rankings;
DROP POLICY IF EXISTS "Users can update own ranking" ON public.user_rankings;

CREATE OR REPLACE FUNCTION public.ensure_user_ranking(_user_id uuid DEFAULT auth.uid())
RETURNS public.user_rankings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_out public.user_rankings;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot create ranking for another user';
  END IF;

  INSERT INTO public.user_rankings(user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO row_out FROM public.user_rankings WHERE user_id = _user_id;
  RETURN row_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_ranking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_stale_sessions(integer) TO service_role;
