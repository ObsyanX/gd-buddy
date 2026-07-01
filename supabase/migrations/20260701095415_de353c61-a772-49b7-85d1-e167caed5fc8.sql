CREATE EXTENSION IF NOT EXISTS vector;

-- conversation_memory
CREATE TABLE public.conversation_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.gd_messages(id) ON DELETE CASCADE,
  participant_id uuid,
  user_id uuid,
  content text NOT NULL,
  embedding vector(384),
  salience real NOT NULL DEFAULT 0.5,
  ts timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversation_memory_session_idx ON public.conversation_memory(session_id, ts DESC);
GRANT SELECT ON public.conversation_memory TO authenticated;
GRANT ALL ON public.conversation_memory TO service_role;
ALTER TABLE public.conversation_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memory_read_participants" ON public.conversation_memory
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

-- duplicate_ideas
CREATE TABLE public.duplicate_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  original_message_id uuid REFERENCES public.gd_messages(id) ON DELETE CASCADE,
  duplicate_message_id uuid REFERENCES public.gd_messages(id) ON DELETE CASCADE,
  similarity real NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.duplicate_ideas TO authenticated;
GRANT ALL ON public.duplicate_ideas TO service_role;
ALTER TABLE public.duplicate_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "duplicates_read_participants" ON public.duplicate_ideas
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

-- fact_checks
CREATE TABLE public.fact_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.gd_messages(id) ON DELETE CASCADE,
  claim text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('supported','disputed','unverifiable')),
  confidence real NOT NULL,
  explanation text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fact_checks TO authenticated;
GRANT ALL ON public.fact_checks TO service_role;
ALTER TABLE public.fact_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facts_read_participants" ON public.fact_checks
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

-- contradictions
CREATE TABLE public.contradictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  earlier_message_id uuid REFERENCES public.gd_messages(id) ON DELETE CASCADE,
  later_message_id uuid REFERENCES public.gd_messages(id) ON DELETE CASCADE,
  same_speaker boolean NOT NULL DEFAULT false,
  confidence real NOT NULL,
  explanation text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contradictions TO authenticated;
GRANT ALL ON public.contradictions TO service_role;
ALTER TABLE public.contradictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contradictions_read_participants" ON public.contradictions
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

-- fallacies
CREATE TABLE public.fallacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.gd_messages(id) ON DELETE CASCADE,
  fallacy_type text NOT NULL,
  confidence real NOT NULL,
  explanation text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fallacies TO authenticated;
GRANT ALL ON public.fallacies TO service_role;
ALTER TABLE public.fallacies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fallacies_read_participants" ON public.fallacies
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

-- Seed policies (align with existing moderation_policies schema)
INSERT INTO public.moderation_policies (scope, rule_id, priority, when_expr, then_action, confidence_floor, enabled)
VALUES
  ('global','memory.duplicate_idea', 25,
   '{"type":"duplicate_idea","min_similarity":0.86}'::jsonb,
   '{"kind":"suggest_new_angle","tone":"gentle"}'::jsonb, 0.7, true),
  ('global','fact.disputed_claim', 35,
   '{"type":"fact","verdicts":["disputed"]}'::jsonb,
   '{"kind":"flag_claim","tone":"neutral"}'::jsonb, 0.6, true),
  ('global','reasoning.fallacy_detected', 30,
   '{"type":"fallacy"}'::jsonb,
   '{"kind":"coach_reasoning"}'::jsonb, 0.7, true);