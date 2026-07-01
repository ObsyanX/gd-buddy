
-- ============ Schema expansion ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.gd_metrics
  ADD COLUMN IF NOT EXISTS sentiment_score INTEGER,
  ADD COLUMN IF NOT EXISTS leadership_score INTEGER,
  ADD COLUMN IF NOT EXISTS teamwork_score INTEGER,
  ADD COLUMN IF NOT EXISTS grammar_score INTEGER,
  ADD COLUMN IF NOT EXISTS sentiment_timeline JSONB DEFAULT '[]'::jsonb;

-- ============ user_feedback ============
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  ai_accuracy_rating INTEGER CHECK (ai_accuracy_rating BETWEEN 1 AND 5),
  ui_rating INTEGER CHECK (ui_rating BETWEEN 1 AND 5),
  category_ratings JSONB DEFAULT '{}'::jsonb,
  comments TEXT,
  nps INTEGER CHECK (nps BETWEEN 0 AND 10),
  would_recommend BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_feedback TO authenticated;
GRANT ALL ON public.user_feedback TO service_role;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own feedback" ON public.user_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own feedback" ON public.user_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit within 24h" ON public.user_feedback FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND created_at > now() - interval '24 hours')
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete within 24h" ON public.user_feedback FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND created_at > now() - interval '24 hours');
CREATE TRIGGER update_user_feedback_updated_at BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ notifications ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON public.notifications(user_id, is_read, created_at DESC);

-- ============ achievements ============
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  criteria JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated, anon;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins manage achievements" ON public.achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ user_achievements ============
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own achievements" ON public.user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own achievements" ON public.user_achievements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ Seed achievements ============
INSERT INTO public.achievements (code, name, description, icon, xp_reward, criteria) VALUES
  ('first_session', 'First Steps', 'Complete your first discussion', '🎯', 50, '{"sessions": 1}'),
  ('five_sessions', 'Getting Started', 'Complete 5 discussions', '🚀', 100, '{"sessions": 5}'),
  ('ten_sessions', 'Dedicated', 'Complete 10 discussions', '💪', 200, '{"sessions": 10}'),
  ('high_scorer', 'High Scorer', 'Achieve a score of 85+', '⭐', 150, '{"score": 85}'),
  ('week_streak', 'Week Warrior', 'Maintain a 7-day streak', '🔥', 250, '{"streak": 7}'),
  ('feedback_giver', 'Helpful Voice', 'Submit your first feedback', '💬', 30, '{"feedback": 1}')
ON CONFLICT (code) DO NOTHING;

-- ============ Admin allowlist trigger ============
CREATE OR REPLACE FUNCTION public.enforce_admin_allowlist()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_email TEXT;
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT email INTO target_email FROM auth.users WHERE id = NEW.user_id;
    IF target_email IS DISTINCT FROM 'duttasayan947595@gdbuddy.com' THEN
      RAISE EXCEPTION 'Admin role is restricted to the authorized administrator only';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_admin_allowlist_trg ON public.user_roles;
CREATE TRIGGER enforce_admin_allowlist_trg
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_allowlist();

-- ============ Create admin user ============
DO $$
DECLARE
  admin_id UUID;
  existing_id UUID;
BEGIN
  SELECT id INTO existing_id FROM auth.users WHERE email = 'duttasayan947595@gdbuddy.com';
  IF existing_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'duttasayan947595@gdbuddy.com',
      crypt('Sayan835dutt@', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, jsonb_build_object('sub', admin_id::text, 'email', 'duttasayan947595@gdbuddy.com'), 'email', admin_id::text, now(), now(), now());
  ELSE
    admin_id := existing_id;
    UPDATE auth.users SET encrypted_password = crypt('Sayan835dutt@', gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = admin_id;
  END IF;

  INSERT INTO public.profiles (id, display_name, email) VALUES (admin_id, 'Admin', 'duttasayan947595@gdbuddy.com')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  -- Remove existing non-admin role, then grant admin
  DELETE FROM public.user_roles WHERE user_id = admin_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');
END $$;
