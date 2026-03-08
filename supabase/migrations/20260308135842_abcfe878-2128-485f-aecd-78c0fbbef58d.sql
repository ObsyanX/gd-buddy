
-- Practice streaks table
CREATE TABLE public.practice_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_practice_date date,
  daily_goal_minutes integer NOT NULL DEFAULT 15,
  today_minutes integer NOT NULL DEFAULT 0,
  total_practice_days integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_streaks ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX practice_streaks_user_id_idx ON public.practice_streaks(user_id);

CREATE POLICY "Users can view own streaks" ON public.practice_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.practice_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.practice_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Session notes table
CREATE TABLE public.session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  note_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session notes" ON public.session_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own session notes" ON public.session_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own session notes" ON public.session_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own session notes" ON public.session_notes FOR DELETE USING (auth.uid() = user_id);
