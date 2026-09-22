-- Personal (BYOK) AI provider credentials, preferences and telemetry.

CREATE TABLE public.user_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_tail TEXT NOT NULL,
  model TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL DEFAULT 'unvalidated',
  validation_message TEXT,
  last_validated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  disabled_until TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_provider_credentials TO authenticated;
GRANT ALL ON public.user_provider_credentials TO service_role;
ALTER TABLE public.user_provider_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own credentials select" ON public.user_provider_credentials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own credentials insert" ON public.user_provider_credentials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own credentials update" ON public.user_provider_credentials
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own credentials delete" ON public.user_provider_credentials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_upc_user_category ON public.user_provider_credentials (user_id, category, priority);

CREATE TABLE public.user_ai_preferences (
  user_id UUID PRIMARY KEY,
  preferred_text TEXT,
  preferred_voice TEXT,
  preferred_stt TEXT,
  preferred_vision TEXT,
  platform_fallback BOOLEAN NOT NULL DEFAULT true,
  priority_order JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_preferences TO authenticated;
GRANT ALL ON public.user_ai_preferences TO service_role;
ALTER TABLE public.user_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prefs select" ON public.user_ai_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own prefs insert" ON public.user_ai_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs update" ON public.user_ai_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs delete" ON public.user_ai_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  model TEXT,
  error_kind TEXT NOT NULL,
  status INTEGER,
  message TEXT,
  fallback_provider TEXT,
  fallback_model TEXT,
  correlation_id TEXT,
  occurrences INTEGER NOT NULL DEFAULT 1,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.ai_provider_events TO authenticated;
GRANT ALL ON public.ai_provider_events TO service_role;
ALTER TABLE public.ai_provider_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ai events select" ON public.ai_provider_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ai events update" ON public.ai_provider_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ai events delete" ON public.ai_provider_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_ape_user_created ON public.ai_provider_events (user_id, created_at DESC);

CREATE TABLE public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  model TEXT,
  outcome TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  reported BOOLEAN NOT NULL DEFAULT false,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ai usage select" ON public.ai_usage_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_aue_user_created ON public.ai_usage_events (user_id, created_at DESC);

-- Retention trim for the two event tables (30 days).
CREATE OR REPLACE FUNCTION public.prune_ai_byok_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev INTEGER;
  us INTEGER;
BEGIN
  DELETE FROM public.ai_provider_events WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS ev = ROW_COUNT;
  DELETE FROM public.ai_usage_events WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS us = ROW_COUNT;
  RETURN jsonb_build_object('provider_events_deleted', ev, 'usage_events_deleted', us);
END;
$$;