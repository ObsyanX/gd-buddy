-- Login analytics: allow the app to record sign-in outcomes without exposing the table.
CREATE OR REPLACE FUNCTION public.log_login_event(
  _success boolean,
  _reason text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_recent int;
BEGIN
  -- Basic abuse guard: at most 30 events per minute from one authenticated user.
  IF v_uid IS NOT NULL THEN
    SELECT count(*) INTO v_recent
      FROM public.login_events
     WHERE user_id = v_uid AND created_at > now() - interval '1 minute';
    IF v_recent >= 30 THEN RETURN; END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  INSERT INTO public.login_events (user_id, email, success, reason, user_agent)
  VALUES (v_uid, v_email, COALESCE(_success, false), left(COALESCE(_reason, ''), 300), left(COALESCE(_user_agent, ''), 300));
END;
$$;

REVOKE ALL ON FUNCTION public.log_login_event(boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_login_event(boolean, text, text) TO anon, authenticated;

-- AI usage tables are written by edge functions (service_role) only.
GRANT INSERT, SELECT ON public.ai_costs TO service_role;
GRANT INSERT, SELECT ON public.token_usage TO service_role;