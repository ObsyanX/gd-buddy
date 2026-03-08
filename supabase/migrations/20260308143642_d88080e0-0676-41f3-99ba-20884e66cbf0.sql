
-- Background jobs queue
CREATE TABLE public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.background_jobs
  FOR SELECT TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can create own jobs" ON public.background_jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage all jobs" ON public.background_jobs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_background_jobs_status ON public.background_jobs(status, scheduled_at);

-- AI training data pipeline
CREATE TABLE public.training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.gd_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  topic text NOT NULL,
  transcript_summary text,
  user_word_count integer DEFAULT 0,
  ai_word_count integer DEFAULT 0,
  session_duration_s integer,
  content_score integer,
  fluency_score integer,
  structure_score integer,
  filler_count integer DEFAULT 0,
  key_arguments jsonb DEFAULT '[]'::jsonb,
  improvement_areas jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training data" ON public.training_data
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training data" ON public.training_data
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all training data" ON public.training_data
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Token usage tracking for cost optimization
CREATE TABLE public.token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  function_name text NOT NULL,
  model text,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  cached boolean DEFAULT false,
  cost_estimate numeric(10,6) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token usage" ON public.token_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token usage" ON public.token_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all token usage" ON public.token_usage
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_token_usage_user ON public.token_usage(user_id, created_at DESC);
CREATE INDEX idx_token_usage_function ON public.token_usage(function_name, created_at DESC);

-- Response cache for cost optimization
CREATE TABLE public.response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  function_name text NOT NULL,
  response_data jsonb NOT NULL,
  ttl_seconds integer NOT NULL DEFAULT 3600,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

ALTER TABLE public.response_cache ENABLE ROW LEVEL SECURITY;

-- Cache is readable by all authenticated users
CREATE POLICY "Authenticated users can read cache" ON public.response_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cache" ON public.response_cache
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_response_cache_key ON public.response_cache(cache_key);
CREATE INDEX idx_response_cache_expires ON public.response_cache(expires_at);
