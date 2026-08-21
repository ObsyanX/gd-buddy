ALTER TABLE public.gd_sessions
  ADD COLUMN IF NOT EXISTS gd_format text NOT NULL DEFAULT 'free_form',
  ADD COLUMN IF NOT EXISTS reading_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS closing_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS hard_stop_at timestamptz;

ALTER TABLE public.gd_sessions
  DROP CONSTRAINT IF EXISTS gd_sessions_gd_format_check;
ALTER TABLE public.gd_sessions
  ADD CONSTRAINT gd_sessions_gd_format_check
  CHECK (gd_format IN ('free_form','structured','case_study','abstract'));