-- Add unique constraint on session_id so upserts work correctly
-- First, deduplicate any existing rows (keep the most recently updated one per session)
DELETE FROM public.gd_metrics a
USING public.gd_metrics b
WHERE a.session_id = b.session_id
  AND a.id <> b.id
  AND a.updated_at < b.updated_at;

-- Now add the unique constraint
ALTER TABLE public.gd_metrics ADD CONSTRAINT gd_metrics_session_id_unique UNIQUE (session_id);