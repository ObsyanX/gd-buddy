
-- Cohorts table
CREATE TABLE public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  instructor_id uuid NOT NULL,
  invite_code text UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cohort members table
CREATE TABLE public.cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cohort_id, user_id)
);

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;

-- Cohorts policies
CREATE POLICY "Instructors can manage own cohorts" ON public.cohorts
  FOR ALL TO authenticated USING (auth.uid() = instructor_id);

CREATE POLICY "Members can view their cohorts" ON public.cohorts
  FOR SELECT TO authenticated
  USING (id IN (SELECT cohort_id FROM public.cohort_members WHERE user_id = auth.uid()));

-- Cohort members policies
CREATE POLICY "Instructors can manage cohort members" ON public.cohort_members
  FOR ALL TO authenticated
  USING (cohort_id IN (SELECT id FROM public.cohorts WHERE instructor_id = auth.uid()));

CREATE POLICY "Members can view own membership" ON public.cohort_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can join cohorts" ON public.cohort_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
