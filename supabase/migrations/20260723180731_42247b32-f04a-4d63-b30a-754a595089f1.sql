
-- 1. Newsletter subscribers: remove public INSERT policy (edge function uses service_role).
DROP POLICY IF EXISTS "anyone can subscribe" ON public.newsletter_subscribers;

-- 2. gd_participants: harden INSERT to prevent impersonation (real_user_id must be null or the caller).
DROP POLICY IF EXISTS "Users can join or add participants" ON public.gd_participants;
CREATE POLICY "Users can join or add participants"
  ON public.gd_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (real_user_id IS NULL OR real_user_id = auth.uid())
    AND (
      public.owns_session(session_id, auth.uid())
      OR (real_user_id = auth.uid() AND public.is_joinable_session(session_id))
    )
  );

-- 3. user_feedback: prevent user_id change on update (defense-in-depth) and add admin delete/moderation policy.
CREATE OR REPLACE FUNCTION public.prevent_user_feedback_owner_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_feedback_lock_owner ON public.user_feedback;
CREATE TRIGGER trg_user_feedback_lock_owner
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW EXECUTE FUNCTION public.prevent_user_feedback_owner_change();

DROP POLICY IF EXISTS "Admins can delete feedback" ON public.user_feedback;
CREATE POLICY "Admins can delete feedback"
  ON public.user_feedback
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
