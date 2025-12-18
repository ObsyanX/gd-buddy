-- Fix: Restrict user_roles table access to authenticated users only
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view user roles" ON public.user_roles;

-- Allow authenticated users to view their own role only
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Keep the existing admin-only management policy (if it exists, this is a no-op safety check)
-- Admins can view all roles for management purposes
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));