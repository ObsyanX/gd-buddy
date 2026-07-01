
-- 1. participant_behaviour
CREATE TABLE public.participant_behaviour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.gd_participants(id) ON DELETE CASCADE,
  talk_time_ms INTEGER NOT NULL DEFAULT 0,
  turn_count INTEGER NOT NULL DEFAULT 0,
  interruption_count INTEGER NOT NULL DEFAULT 0,
  avg_turn_ms INTEGER NOT NULL DEFAULT 0,
  dominance_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  engagement_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  sentiment_avg NUMERIC(4,3) NOT NULL DEFAULT 0,
  sentiment_trend NUMERIC(4,3) NOT NULL DEFAULT 0,
  emotion_label TEXT,
  last_spoke_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, participant_id)
);
GRANT SELECT ON public.participant_behaviour TO authenticated;
GRANT ALL ON public.participant_behaviour TO service_role;
ALTER TABLE public.participant_behaviour ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read behaviour" ON public.participant_behaviour
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));
CREATE POLICY "Admins manage behaviour" ON public.participant_behaviour
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_participant_behaviour_updated
  BEFORE UPDATE ON public.participant_behaviour
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. discussion_health
CREATE TABLE public.discussion_health (
  session_id UUID PRIMARY KEY REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  participation_gini NUMERIC(4,3) NOT NULL DEFAULT 0,
  interruption_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  sentiment_index NUMERIC(4,3) NOT NULL DEFAULT 0,
  topic_focus NUMERIC(4,3) NOT NULL DEFAULT 0,
  energy NUMERIC(4,3) NOT NULL DEFAULT 0,
  overall_health INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discussion_health TO authenticated;
GRANT ALL ON public.discussion_health TO service_role;
ALTER TABLE public.discussion_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read health" ON public.discussion_health
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));
CREATE POLICY "Admins manage health" ON public.discussion_health
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_discussion_health_updated
  BEFORE UPDATE ON public.discussion_health
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. emotion_events
CREATE TABLE public.emotion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.gd_participants(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('text','prosody','fused')),
  label TEXT NOT NULL,
  valence NUMERIC(4,3) NOT NULL DEFAULT 0,
  arousal NUMERIC(4,3) NOT NULL DEFAULT 0,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.emotion_events TO authenticated;
GRANT ALL ON public.emotion_events TO service_role;
ALTER TABLE public.emotion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read emotion" ON public.emotion_events
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));
CREATE POLICY "Admins manage emotion" ON public.emotion_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_emotion_events_session_created ON public.emotion_events(session_id, created_at DESC);
CREATE INDEX idx_participant_behaviour_session ON public.participant_behaviour(session_id);

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.participant_behaviour;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_health;

-- 5. Seed moderation_policies (schema: rule_id, scope, when_expr, then_action, priority, confidence_floor, enabled)
INSERT INTO public.moderation_policies (rule_id, scope, when_expr, then_action, priority, confidence_floor, enabled)
VALUES
  ('dominance_nudge', 'global',
   '{"signal":"behaviour_snapshot","dominance_score":{"gt":0.6},"sustained_seconds":{"gte":60}}'::jsonb,
   '{"action":"nudge_share_time","cooldown_seconds":90,"description":"Nudge dominant speaker to yield time"}'::jsonb,
   60, 0.6, true),
  ('invite_quiet_participant', 'global',
   '{"signal":"behaviour_snapshot","engagement_score":{"lt":0.25}}'::jsonb,
   '{"action":"invite_to_speak","cooldown_seconds":120,"description":"Invite a low-engagement participant"}'::jsonb,
   55, 0.5, true),
  ('deescalate_negative_spike', 'global',
   '{"signal":"emotion_event","valence":{"lt":-0.5},"confidence":{"gt":0.7}}'::jsonb,
   '{"action":"deescalation_prompt","cooldown_seconds":60,"description":"De-escalation prompt on negative spike"}'::jsonb,
   80, 0.7, true),
  ('low_health_refocus', 'global',
   '{"signal":"health_tick","overall_health":{"lt":40},"consecutive_ticks":{"gte":2}}'::jsonb,
   '{"action":"moderator_refocus","cooldown_seconds":120,"description":"Moderator summary and refocus"}'::jsonb,
   70, 0.5, true)
ON CONFLICT DO NOTHING;
