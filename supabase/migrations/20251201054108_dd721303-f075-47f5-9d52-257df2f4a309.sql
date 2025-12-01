-- Create enum types
CREATE TYPE discussion_status AS ENUM ('setup', 'active', 'paused', 'completed');
CREATE TYPE participant_intent AS ENUM ('agree', 'elaborate', 'contradict', 'ask_question', 'summarize', 'counterpoint', 'example', 'clarify');

-- Sessions table
CREATE TABLE public.gd_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  topic TEXT NOT NULL,
  topic_category TEXT,
  topic_difficulty TEXT,
  topic_tags TEXT[],
  status discussion_status NOT NULL DEFAULT 'setup',
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Participants table
CREATE TABLE public.gd_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  is_user BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL,
  persona_name TEXT NOT NULL,
  persona_role TEXT,
  persona_tone TEXT,
  persona_verbosity TEXT,
  persona_interrupt_level DECIMAL(3,2) DEFAULT 0.3,
  persona_agreeability DECIMAL(3,2) DEFAULT 0,
  persona_vocab_level TEXT DEFAULT 'intermediate',
  voice_name TEXT,
  voice_rate_pct INT DEFAULT 100,
  voice_pitch_pct INT DEFAULT 0,
  voice_style TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages/turns table
CREATE TABLE public.gd_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.gd_participants(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  intent participant_intent,
  interruption BOOLEAN DEFAULT false,
  overlap_seconds DECIMAL(3,2),
  tts_ssml TEXT,
  confidence_estimate DECIMAL(3,2),
  start_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_ts TIMESTAMP WITH TIME ZONE
);

-- Metrics table (user performance tracking)
CREATE TABLE public.gd_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  fluency_score INT,
  content_score INT,
  structure_score INT,
  voice_score INT,
  filler_count INT DEFAULT 0,
  avg_pause_s DECIMAL(5,2),
  words_per_min DECIMAL(6,2),
  total_words INT DEFAULT 0,
  clarity_issues JSONB,
  star_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invigilator feedback table (live coaching)
CREATE TABLE public.gd_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.gd_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.gd_messages(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  severity TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gd_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public access (no auth required for MVP)
CREATE POLICY "Allow all access to sessions" ON public.gd_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to participants" ON public.gd_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to messages" ON public.gd_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to metrics" ON public.gd_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to feedback" ON public.gd_feedback FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_gd_sessions_status ON public.gd_sessions(status);
CREATE INDEX idx_gd_participants_session ON public.gd_participants(session_id);
CREATE INDEX idx_gd_messages_session ON public.gd_messages(session_id);
CREATE INDEX idx_gd_messages_participant ON public.gd_messages(participant_id);
CREATE INDEX idx_gd_metrics_session ON public.gd_metrics(session_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gd_sessions_updated_at
  BEFORE UPDATE ON public.gd_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gd_metrics_updated_at
  BEFORE UPDATE ON public.gd_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();