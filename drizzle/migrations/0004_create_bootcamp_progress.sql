CREATE TABLE public.bootcamp_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day INT NOT NULL CHECK (day BETWEEN 1 AND 14),
  score INT,
  session_id UUID,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bootcamp_progress TO authenticated;
GRANT ALL ON public.bootcamp_progress TO service_role;

ALTER TABLE public.bootcamp_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bootcamp progress"
ON public.bootcamp_progress FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bootcamp progress"
ON public.bootcamp_progress FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bootcamp progress"
ON public.bootcamp_progress FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);