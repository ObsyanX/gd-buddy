CREATE TABLE public.knowledge_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  node_type text NOT NULL CHECK (node_type IN ('concept','argument','evidence','counter','question')),
  label text NOT NULL,
  salience real NOT NULL DEFAULT 0.5,
  first_message_id uuid REFERENCES public.gd_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_nodes_session_idx ON public.knowledge_nodes(session_id);
GRANT SELECT ON public.knowledge_nodes TO authenticated;
GRANT ALL ON public.knowledge_nodes TO service_role;
ALTER TABLE public.knowledge_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kn_read_participants" ON public.knowledge_nodes
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

CREATE TABLE public.knowledge_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  from_node uuid NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  to_node uuid NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  relation text NOT NULL CHECK (relation IN ('supports','contradicts','elaborates','questions','cites')),
  strength real NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_edges_session_idx ON public.knowledge_edges(session_id);
GRANT SELECT ON public.knowledge_edges TO authenticated;
GRANT ALL ON public.knowledge_edges TO service_role;
ALTER TABLE public.knowledge_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ke_read_participants" ON public.knowledge_edges
  FOR SELECT TO authenticated
  USING (public.can_access_session(session_id, auth.uid()));

CREATE TABLE public.coaching_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category text NOT NULL,
  priority smallint NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  headline text NOT NULL,
  body text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coaching_tips_user_idx ON public.coaching_tips(user_id, created_at DESC);
GRANT SELECT ON public.coaching_tips TO authenticated;
GRANT ALL ON public.coaching_tips TO service_role;
ALTER TABLE public.coaching_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tips_read_own_or_participants" ON public.coaching_tips
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_session(session_id, auth.uid()));

CREATE TABLE public.session_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  clarity real NOT NULL DEFAULT 0,
  reasoning real NOT NULL DEFAULT 0,
  collaboration real NOT NULL DEFAULT 0,
  evidence real NOT NULL DEFAULT 0,
  emotional_intelligence real NOT NULL DEFAULT 0,
  leadership real NOT NULL DEFAULT 0,
  overall real NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT ON public.session_scores TO authenticated;
GRANT ALL ON public.session_scores TO service_role;
ALTER TABLE public.session_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores_read_own_or_participants" ON public.session_scores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_session(session_id, auth.uid()));

CREATE TRIGGER trg_session_scores_updated_at
  BEFORE UPDATE ON public.session_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();