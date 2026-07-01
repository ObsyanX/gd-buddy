
-- Track 9 Slice 1 — Governance foundations

-- 1) ai_models
CREATE TABLE public.ai_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose IN ('reasoning','embedding','fact','evaluation','coaching','graph','report','fallback','moderation','completion','emotion')),
  vendor TEXT NOT NULL,
  model_id TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (purpose, vendor, model_id, version)
);
GRANT SELECT ON public.ai_models TO authenticated;
GRANT ALL ON public.ai_models TO service_role;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_models readable by authenticated" ON public.ai_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_models managed by admin" ON public.ai_models FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_ai_models_updated BEFORE UPDATE ON public.ai_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) prompts
CREATE TABLE public.prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('moderator','coaching','conclusion','counterargument','fact','reflection','report','reasoning','completion','graph','emotion','safety')),
  version TEXT NOT NULL DEFAULT 'v1',
  language TEXT NOT NULL DEFAULT 'en',
  owner UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  ab_flag TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_prompts_unique ON public.prompts(category, version, language, COALESCE(org_id::text,'GLOBAL'), COALESCE(ab_flag,''));
GRANT SELECT ON public.prompts TO authenticated;
GRANT ALL ON public.prompts TO service_role;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prompts readable when active" ON public.prompts FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "prompts managed by admin" ON public.prompts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_prompts_updated BEFORE UPDATE ON public.prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) subsystem_versions
CREATE TABLE public.subsystem_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'session',
  policy_version TEXT,
  reasoning_version TEXT,
  scoring_version TEXT,
  graph_version TEXT,
  prompt_version TEXT,
  model_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subsystem_versions TO authenticated;
GRANT ALL ON public.subsystem_versions TO service_role;
ALTER TABLE public.subsystem_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subsystem_versions readable by admin or session owner" ON public.subsystem_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR (session_id IS NOT NULL AND public.can_access_session(session_id, auth.uid())));

-- 4) calibration_bins
CREATE TABLE public.calibration_bins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  bin_lo NUMERIC NOT NULL,
  bin_hi NUMERIC NOT NULL,
  samples INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  empirical_accuracy NUMERIC NOT NULL DEFAULT 0,
  window_days INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (action, bin_lo, bin_hi, window_days)
);
GRANT SELECT ON public.calibration_bins TO authenticated;
GRANT ALL ON public.calibration_bins TO service_role;
ALTER TABLE public.calibration_bins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calibration_bins readable by authenticated" ON public.calibration_bins FOR SELECT TO authenticated USING (true);

-- 5) overrides
CREATE TABLE public.overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  decision_id UUID REFERENCES public.moderator_decisions(id) ON DELETE SET NULL,
  original_decision JSONB NOT NULL DEFAULT '{}'::jsonb,
  manual_decision JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.overrides TO authenticated;
GRANT ALL ON public.overrides TO service_role;
ALTER TABLE public.overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overrides readable by admin or session host" ON public.overrides FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR (session_id IS NOT NULL AND public.owns_session(session_id, auth.uid())));
CREATE POLICY "overrides insert by session host/admin" ON public.overrides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR (session_id IS NOT NULL AND public.owns_session(session_id, auth.uid())));

-- 6) event_log (append-only)
CREATE TABLE public.event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  seq BIGSERIAL,
  kind TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_log_session_seq ON public.event_log(session_id, seq);
CREATE INDEX idx_event_log_kind ON public.event_log(kind);
GRANT SELECT, INSERT ON public.event_log TO authenticated;
GRANT ALL ON public.event_log TO service_role;
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_log readable by session participant or admin" ON public.event_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR (session_id IS NOT NULL AND public.can_access_session(session_id, auth.uid())));
CREATE POLICY "event_log insert by session participant" ON public.event_log FOR INSERT TO authenticated
  WITH CHECK (session_id IS NULL OR public.can_access_session(session_id, auth.uid()));

-- 7) ai_costs
CREATE TABLE public.ai_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT,
  function_name TEXT NOT NULL,
  model_id TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_estimate NUMERIC NOT NULL DEFAULT 0,
  session_id UUID REFERENCES public.gd_sessions(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_costs_created ON public.ai_costs(created_at DESC);
CREATE INDEX idx_ai_costs_function ON public.ai_costs(function_name);
GRANT SELECT ON public.ai_costs TO authenticated;
GRANT ALL ON public.ai_costs TO service_role;
ALTER TABLE public.ai_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_costs admin read" ON public.ai_costs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- 8) safety_incidents
CREATE TABLE public.safety_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('injection','jailbreak','toxic','unsafe','pii','other')),
  verdict TEXT NOT NULL CHECK (verdict IN ('blocked','flagged','allowed')),
  snippet_hash TEXT,
  function_name TEXT,
  session_id UUID REFERENCES public.gd_sessions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.safety_incidents TO authenticated;
GRANT ALL ON public.safety_incidents TO service_role;
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "safety_incidents admin read" ON public.safety_incidents FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- 9) perf_budgets
CREATE TABLE public.perf_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  p50_ms INTEGER,
  p90_ms INTEGER,
  p95_ms INTEGER,
  p99_ms INTEGER,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.perf_budgets TO authenticated;
GRANT ALL ON public.perf_budgets TO service_role;
ALTER TABLE public.perf_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perf_budgets readable by authenticated" ON public.perf_budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "perf_budgets managed by admin" ON public.perf_budgets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_perf_budgets_updated BEFORE UPDATE ON public.perf_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) adr_docs
CREATE TABLE public.adr_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted',
  problem TEXT,
  decision TEXT,
  alternatives TEXT,
  tradeoffs TEXT,
  consequences TEXT,
  md_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.adr_docs TO authenticated;
GRANT ALL ON public.adr_docs TO service_role;
ALTER TABLE public.adr_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adr_docs readable by authenticated" ON public.adr_docs FOR SELECT TO authenticated USING (true);
CREATE POLICY "adr_docs managed by admin" ON public.adr_docs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_adr_docs_updated BEFORE UPDATE ON public.adr_docs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11) research_exports
CREATE TABLE public.research_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  anonymized_at TIMESTAMPTZ,
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.research_exports TO authenticated;
GRANT ALL ON public.research_exports TO service_role;
ALTER TABLE public.research_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "research_exports admin read" ON public.research_exports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_research_exports_updated BEFORE UPDATE ON public.research_exports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12) accessibility_prefs
CREATE TABLE public.accessibility_prefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  captions BOOLEAN NOT NULL DEFAULT false,
  high_contrast BOOLEAN NOT NULL DEFAULT false,
  dyslexia_font BOOLEAN NOT NULL DEFAULT false,
  font_scale NUMERIC NOT NULL DEFAULT 1.0 CHECK (font_scale BETWEEN 0.75 AND 2.0),
  timer_visibility TEXT NOT NULL DEFAULT 'default',
  speech_rate NUMERIC NOT NULL DEFAULT 1.0 CHECK (speech_rate BETWEEN 0.5 AND 2.0),
  colorblind_palette TEXT NOT NULL DEFAULT 'default',
  locale TEXT NOT NULL DEFAULT 'en',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_accessibility_prefs_user ON public.accessibility_prefs(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_accessibility_prefs_org ON public.accessibility_prefs(org_id) WHERE org_id IS NOT NULL AND user_id IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessibility_prefs TO authenticated;
GRANT ALL ON public.accessibility_prefs TO service_role;
ALTER TABLE public.accessibility_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accessibility_prefs self read" ON public.accessibility_prefs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "accessibility_prefs self write" ON public.accessibility_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_accessibility_prefs_updated BEFORE UPDATE ON public.accessibility_prefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13) benchmark_reports
CREATE TABLE public.benchmark_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  dataset_ref TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  precision NUMERIC,
  recall NUMERIC,
  f1 NUMERIC,
  false_positives INTEGER,
  false_negatives INTEGER,
  ai_human_agreement NUMERIC,
  calibration_ece NUMERIC,
  model_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.benchmark_reports TO authenticated;
GRANT ALL ON public.benchmark_reports TO service_role;
ALTER TABLE public.benchmark_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benchmark_reports admin read" ON public.benchmark_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- Seed default perf budgets
INSERT INTO public.perf_budgets(name, p50_ms, p90_ms, p95_ms, p99_ms, description) VALUES
  ('mic.allocation', 40, 80, 100, 150, 'request_mic/release_mic RPC round-trip'),
  ('policy.evaluation', 15, 35, 50, 90, 'policy-engine edge function'),
  ('reasoning.engine', 120, 250, 300, 500, 'reasoning-agent edge function'),
  ('graph.update', 200, 400, 500, 900, 'graph-builder edge function'),
  ('embedding.generation', 800, 1500, 2000, 3500, 'memory-indexer embeddings'),
  ('replay.loading', 800, 1500, 2000, 3500, 'replay-player initial load'),
  ('report.generation', 3000, 7000, 10000, 20000, 'session report full render')
ON CONFLICT (name) DO NOTHING;
