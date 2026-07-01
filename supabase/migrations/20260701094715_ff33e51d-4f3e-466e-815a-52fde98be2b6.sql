CREATE TABLE public.silence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  stage smallint NOT NULL CHECK (stage BETWEEN 1 AND 3),
  target_user_id uuid,
  silence_seconds int NOT NULL,
  prompt_text text,
  fired_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.silence_events TO authenticated;
GRANT ALL ON public.silence_events TO service_role;
ALTER TABLE public.silence_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "silence_events_read_participants" ON public.silence_events
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

CREATE TABLE public.completion_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  confidence numeric(3,2) NOT NULL,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acted_on boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.completion_signals TO authenticated;
GRANT ALL ON public.completion_signals TO service_role;
ALTER TABLE public.completion_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completion_signals_read_participants" ON public.completion_signals
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

CREATE TABLE public.adaptive_speaking_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recommended_seconds int NOT NULL DEFAULT 60,
  used_seconds int NOT NULL DEFAULT 0,
  weight numeric(3,2) NOT NULL DEFAULT 1.0,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT ON public.adaptive_speaking_allowances TO authenticated;
GRANT ALL ON public.adaptive_speaking_allowances TO service_role;
ALTER TABLE public.adaptive_speaking_allowances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowances_read_participants" ON public.adaptive_speaking_allowances
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

CREATE TRIGGER trg_allowances_updated_at
  BEFORE UPDATE ON public.adaptive_speaking_allowances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.moderation_policies (scope, rule_id, priority, when_expr, then_action, confidence_floor, enabled)
VALUES
  ('global','silence.stage1_nudge', 20,
   '{"type":"silence","min_seconds":12,"max_seconds":24}'::jsonb,
   '{"kind":"prompt_room","tone":"gentle"}'::jsonb, 0.5, true),
  ('global','silence.stage2_escalate', 30,
   '{"type":"silence","min_seconds":25,"max_seconds":45}'::jsonb,
   '{"kind":"prompt_participant","target":"quietest"}'::jsonb, 0.6, true),
  ('global','discussion.completion_detected', 40,
   '{"type":"completion","min_confidence":0.75}'::jsonb,
   '{"kind":"suggest_wrap_up"}'::jsonb, 0.75, true);