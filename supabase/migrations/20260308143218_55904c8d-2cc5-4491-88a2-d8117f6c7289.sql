
-- Error logs table
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text NOT NULL,
  error_stack text,
  error_source text NOT NULL DEFAULT 'client',
  page_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own error logs" ON public.error_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own error logs" ON public.error_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all error logs" ON public.error_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Experiments table
CREATE TABLE public.experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  variants jsonb NOT NULL DEFAULT '["control","variant"]'::jsonb,
  traffic_percent integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read experiments" ON public.experiments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage experiments" ON public.experiments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Experiment assignments
CREATE TABLE public.experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  experiment_id uuid REFERENCES public.experiments(id) ON DELETE CASCADE NOT NULL,
  variant text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, experiment_id)
);

ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments" ON public.experiment_assignments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assignments" ON public.experiment_assignments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add instructor role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'instructor';
