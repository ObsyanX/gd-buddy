ALTER TABLE public.share_events
  ADD COLUMN IF NOT EXISTS signature text,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS share_events_target_created_idx
  ON public.share_events (target, created_at DESC);

CREATE INDEX IF NOT EXISTS share_events_kind_event_created_idx
  ON public.share_events (kind, event_type, created_at DESC);