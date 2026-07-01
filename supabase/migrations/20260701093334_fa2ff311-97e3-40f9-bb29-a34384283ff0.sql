-- Track 1: Foundations — orgs, config center, policies, audit, perf, explainability

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their org" ON public.organizations
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- 2. Org config center (jsonb keyed config: policy_rules, speaking_limits, personality, privacy, memory, evaluation_weights, report_templates, accessibility)
CREATE TABLE IF NOT EXISTS public.org_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_configs TO authenticated;
GRANT ALL ON public.org_configs TO service_role;
ALTER TABLE public.org_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read config" ON public.org_configs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND (o.owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))));
CREATE POLICY "Org owners write config" ON public.org_configs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND (o.owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND (o.owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))));

-- 3. Moderation policies (global / org / session scope)
CREATE TABLE IF NOT EXISTS public.moderation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('global','org','session')),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  when_expr JSONB NOT NULL,
  then_action JSONB NOT NULL,
  confidence_floor REAL NOT NULL DEFAULT 0.5,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_policies_scope_idx ON public.moderation_policies(scope, org_id, session_id);
GRANT SELECT ON public.moderation_policies TO authenticated;
GRANT ALL ON public.moderation_policies TO service_role;
ALTER TABLE public.moderation_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read policies for accessible scope" ON public.moderation_policies
  FOR SELECT TO authenticated
  USING (
    scope = 'global'
    OR (scope = 'org' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND (o.owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))))
    OR (scope = 'session' AND public.can_access_session(session_id, auth.uid()))
  );
CREATE POLICY "Admins write policies" ON public.moderation_policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Seed 8 default global rules
INSERT INTO public.moderation_policies (scope, rule_id, priority, when_expr, then_action, confidence_floor) VALUES
  ('global','queue_not_empty_wait',10,'{"queue_size":{">":0}}','{"action":"wait"}',0.9),
  ('global','silence_engage',20,'{"silence_ms":{">":30000}}','{"action":"engage_prompt"}',0.7),
  ('global','interruptions_warn',30,'{"interruptions":{">":3}}','{"action":"warn_interruption"}',0.7),
  ('global','dominance_invite_quiet',40,'{"top_dominance_pct":{">":45}}','{"action":"invite_quiet"}',0.7),
  ('global','drift_redirect',50,'{"drift_score":{">":0.6}}','{"action":"redirect"}',0.75),
  ('global','low_confidence_suggest',60,'{"ai_confidence":{"<":0.5}}','{"action":"suggest_only"}',0.5),
  ('global','all_spoken_recommend_conclusion',70,'{"all_spoken":true,"completion_score":{">":0.8}}','{"action":"recommend_conclusion"}',0.8),
  ('global','quality_drop_followup',80,'{"quality_score":{"<":0.4}}','{"action":"followup_prompt"}',0.6)
ON CONFLICT DO NOTHING;

-- 4. Extend moderator_decisions with explainability fields
ALTER TABLE public.moderator_decisions
  ADD COLUMN IF NOT EXISTS reasoning_trace JSONB,
  ADD COLUMN IF NOT EXISTS alternatives JSONB,
  ADD COLUMN IF NOT EXISTS chosen_because TEXT,
  ADD COLUMN IF NOT EXISTS matched_rule TEXT;

-- 5. Audit events (privacy/governance)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON public.audit_events(actor_user_id, created_at DESC);
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own audit" ON public.audit_events
  FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- 6. Perf events (observability)
CREATE TABLE IF NOT EXISTS public.perf_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  name TEXT NOT NULL,
  duration_ms INT NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perf_events_name_time_idx ON public.perf_events(name, created_at DESC);
CREATE INDEX IF NOT EXISTS perf_events_session_idx ON public.perf_events(session_id, created_at DESC);
GRANT SELECT ON public.perf_events TO authenticated;
GRANT ALL ON public.perf_events TO service_role;
ALTER TABLE public.perf_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read perf" ON public.perf_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- 7. Consent flag on participants (privacy)
ALTER TABLE public.gd_participants
  ADD COLUMN IF NOT EXISTS consent_recording BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_analytics BOOLEAN NOT NULL DEFAULT false;

-- 8. Termination reason + silence meta on sessions
ALTER TABLE public.gd_sessions
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS silence_meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 9. Data export & delete RPCs (GDPR-ish)
CREATE OR REPLACE FUNCTION public.export_user_data(_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB;
BEGIN
  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = _user_id),
    'sessions', (SELECT jsonb_agg(to_jsonb(s)) FROM public.gd_sessions s WHERE s.user_id = _user_id),
    'messages', (SELECT jsonb_agg(to_jsonb(m)) FROM public.gd_messages m JOIN public.gd_participants p ON p.id = m.participant_id WHERE p.real_user_id = _user_id),
    'feedback', (SELECT jsonb_agg(to_jsonb(f)) FROM public.user_feedback f WHERE f.user_id = _user_id)
  ) INTO result;
  INSERT INTO public.audit_events(actor_user_id, action, resource_type, resource_id)
    VALUES (auth.uid(), 'data_export', 'user', _user_id::text);
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.gd_messages m USING public.gd_participants p WHERE p.id = m.participant_id AND p.real_user_id = _user_id;
  DELETE FROM public.gd_sessions WHERE user_id = _user_id;
  DELETE FROM public.user_feedback WHERE user_id = _user_id;
  INSERT INTO public.audit_events(actor_user_id, action, resource_type, resource_id)
    VALUES (auth.uid(), 'data_delete', 'user', _user_id::text);
END; $$;
