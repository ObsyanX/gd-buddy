
CREATE TABLE IF NOT EXISTS public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  visitor_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  event_type text NOT NULL DEFAULT 'share',
  target text,
  path text,
  ref text,
  room_code text,
  device text,
  browser text,
  os text,
  country text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.share_events TO authenticated;
GRANT ALL ON public.share_events TO service_role;

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read share events" ON public.share_events;
CREATE POLICY "Admins can read share events"
  ON public.share_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_share_events_created_at ON public.share_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_events_kind_type ON public.share_events (kind, event_type);
CREATE INDEX IF NOT EXISTS idx_share_events_ref ON public.share_events (ref) WHERE ref IS NOT NULL;
