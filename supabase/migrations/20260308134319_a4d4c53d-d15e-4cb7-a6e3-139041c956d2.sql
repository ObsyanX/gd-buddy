
CREATE TABLE public.custom_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT,
  time_limit INTEGER NOT NULL DEFAULT 60,
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom drills"
  ON public.custom_drills FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own custom drills"
  ON public.custom_drills FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom drills"
  ON public.custom_drills FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom drills"
  ON public.custom_drills FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
