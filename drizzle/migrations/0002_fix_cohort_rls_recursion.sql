CREATE OR REPLACE FUNCTION public.is_instructor_cohort_owner(_cohort_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.instructor_cohorts WHERE id = _cohort_id AND instructor_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.is_instructor_cohort_member(_cohort_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.instructor_cohort_members WHERE cohort_id = _cohort_id AND user_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.is_cohort_owner(_cohort_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.cohorts WHERE id = _cohort_id AND instructor_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.is_cohort_member(_cohort_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.cohort_members WHERE cohort_id = _cohort_id AND user_id = _user_id)
$$;

DROP POLICY IF EXISTS "Instructors can manage cohort members" ON public.cohort_members;
CREATE POLICY "Instructors can manage cohort members" ON public.cohort_members FOR ALL TO authenticated
  USING (public.is_cohort_owner(cohort_id, auth.uid())) WITH CHECK (public.is_cohort_owner(cohort_id, auth.uid()));
DROP POLICY IF EXISTS "Members can view their cohorts" ON public.cohorts;
CREATE POLICY "Members can view their cohorts" ON public.cohorts FOR SELECT TO authenticated
  USING (public.is_cohort_member(id, auth.uid()));

DROP POLICY IF EXISTS "instructors can add cohort members" ON public.instructor_cohort_members;
CREATE POLICY "instructors can add cohort members" ON public.instructor_cohort_members FOR INSERT TO authenticated
  WITH CHECK (public.is_instructor_cohort_owner(cohort_id, auth.uid()));
DROP POLICY IF EXISTS "instructors can remove cohort members" ON public.instructor_cohort_members;
CREATE POLICY "instructors can remove cohort members" ON public.instructor_cohort_members FOR DELETE TO authenticated
  USING (public.is_instructor_cohort_owner(cohort_id, auth.uid()));
DROP POLICY IF EXISTS "instructors can view cohort members" ON public.instructor_cohort_members;
CREATE POLICY "instructors can view cohort members" ON public.instructor_cohort_members FOR SELECT TO authenticated
  USING (public.is_instructor_cohort_owner(cohort_id, auth.uid()));
DROP POLICY IF EXISTS "members can view their cohorts" ON public.instructor_cohorts;
CREATE POLICY "members can view their cohorts" ON public.instructor_cohorts FOR SELECT TO authenticated
  USING (public.is_instructor_cohort_member(id, auth.uid()));
DROP POLICY IF EXISTS "members can view cohort mock drives" ON public.mock_drives;
CREATE POLICY "members can view cohort mock drives" ON public.mock_drives FOR SELECT TO authenticated
  USING (public.is_instructor_cohort_member(cohort_id, auth.uid()));