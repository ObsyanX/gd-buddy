
CREATE TABLE public.moderator_personalities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tone TEXT NOT NULL DEFAULT 'balanced',
  intervention_rate NUMERIC NOT NULL DEFAULT 0.5 CHECK (intervention_rate BETWEEN 0 AND 1),
  strictness NUMERIC NOT NULL DEFAULT 0.5 CHECK (strictness BETWEEN 0 AND 1),
  encouragement NUMERIC NOT NULL DEFAULT 0.5 CHECK (encouragement BETWEEN 0 AND 1),
  policy_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt_template TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderator_personalities TO authenticated;
GRANT ALL ON public.moderator_personalities TO service_role;
ALTER TABLE public.moderator_personalities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personalities readable to authenticated"
  ON public.moderator_personalities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage personalities"
  ON public.moderator_personalities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.session_replays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_replays TO authenticated;
GRANT ALL ON public.session_replays TO service_role;
ALTER TABLE public.session_replays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replays viewable by owner or participants"
  ON public.session_replays FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.gd_participants p
               WHERE p.session_id = session_replays.session_id AND p.real_user_id = auth.uid())
  );
CREATE POLICY "Owner creates replay"
  ON public.session_replays FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner updates replay"
  ON public.session_replays FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.replay_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  replay_id UUID NOT NULL REFERENCES public.session_replays(id) ON DELETE CASCADE,
  offset_ms INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor_id UUID,
  actor_kind TEXT NOT NULL DEFAULT 'human',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_replay_events_replay ON public.replay_events(replay_id, offset_ms);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replay_events TO authenticated;
GRANT ALL ON public.replay_events TO service_role;
ALTER TABLE public.replay_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replay events viewable via replay"
  ON public.replay_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.session_replays sr
    WHERE sr.id = replay_events.replay_id
      AND (sr.owner_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.gd_participants p
                      WHERE p.session_id = sr.session_id AND p.real_user_id = auth.uid()))
  ));
CREATE POLICY "Replay events insertable by owner"
  ON public.replay_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.session_replays sr
    WHERE sr.id = replay_events.replay_id AND sr.owner_id = auth.uid()
  ));

CREATE TABLE public.enterprise_metrics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  participants_count INTEGER NOT NULL DEFAULT 0,
  avg_health NUMERIC,
  avg_radar JSONB NOT NULL DEFAULT '{}'::jsonb,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, day)
);
GRANT SELECT ON public.enterprise_metrics_daily TO authenticated;
GRANT ALL ON public.enterprise_metrics_daily TO service_role;
ALTER TABLE public.enterprise_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owner or admin views enterprise metrics"
  ON public.enterprise_metrics_daily FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o
            WHERE o.id = enterprise_metrics_daily.org_id AND o.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_moderator_personalities_updated
  BEFORE UPDATE ON public.moderator_personalities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_session_replays_updated
  BEFORE UPDATE ON public.session_replays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_enterprise_metrics_daily_updated
  BEFORE UPDATE ON public.enterprise_metrics_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.moderator_personalities (name, description, tone, intervention_rate, strictness, encouragement, is_default, prompt_template)
VALUES
  ('Balanced Moderator', 'Fair and neutral, intervenes when needed.', 'balanced', 0.5, 0.5, 0.5, true,
    'You are a balanced GD moderator. Keep discussion on track and ensure fair participation.'),
  ('Strict Moderator', 'Enforces time limits and topic boundaries firmly.', 'firm', 0.75, 0.85, 0.3, false,
    'You are a strict GD moderator. Enforce rules, cut off drift, hold speakers to time.'),
  ('Encouraging Coach', 'Supportive, gives frequent positive reinforcement.', 'warm', 0.4, 0.3, 0.9, false,
    'You are an encouraging GD coach. Uplift quieter voices and celebrate strong contributions.'),
  ('Socratic Facilitator', 'Asks probing questions rather than directing.', 'inquisitive', 0.6, 0.4, 0.6, false,
    'You are a Socratic facilitator. Ask probing follow-up questions instead of directing outcomes.');
