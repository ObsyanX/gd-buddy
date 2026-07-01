
ALTER TABLE public.gd_sessions
  ADD COLUMN IF NOT EXISTS extension_used boolean NOT NULL DEFAULT false;
