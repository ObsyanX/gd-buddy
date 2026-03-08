
CREATE TABLE public.skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  current_score NUMERIC DEFAULT 0,
  level TEXT DEFAULT 'beginner',
  total_practice_minutes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_name)
);

ALTER TABLE public.skill_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill progress"
  ON public.skill_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill progress"
  ON public.skill_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill progress"
  ON public.skill_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
