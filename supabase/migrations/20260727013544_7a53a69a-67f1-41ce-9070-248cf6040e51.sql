
CREATE TABLE IF NOT EXISTS public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  user_id uuid,
  kind text NOT NULL,              -- 'profile' | 'report' | 'invite' | 'multiplayer' | 'generic'
  event_type text NOT NULL,        -- 'share' | 'install' | 'join'
  target text,                     -- 'whatsapp' | 'native' | 'copy' | ...
  path text,
  ref text,                        -- attribution ref captured from ?ref=
  room_code text,
  device text,
  browser text,
  os text,
  country text,
  extra jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_events TO authenticated;
GRANT ALL ON public.share_events TO service_role;

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_analysts_read_share_events"
  ON public.share_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'analyst'::app_role));

CREATE INDEX IF NOT EXISTS share_events_created_idx ON public.share_events (created_at DESC);
CREATE INDEX IF NOT EXISTS share_events_kind_type_idx ON public.share_events (kind, event_type);
CREATE INDEX IF NOT EXISTS share_events_ref_idx ON public.share_events (ref) WHERE ref IS NOT NULL;
