ALTER TABLE public.gd_messages
  ADD COLUMN IF NOT EXISTS novelty_note text,
  ADD COLUMN IF NOT EXISTS lens text,
  ADD COLUMN IF NOT EXISTS citation text;