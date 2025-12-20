-- Create custom_personas table for user-created AI participants
CREATE TABLE public.custom_personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  core_perspective TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'neutral',
  verbosity TEXT NOT NULL DEFAULT 'moderate' CHECK (verbosity IN ('concise', 'moderate', 'elaborate')),
  vocab_level TEXT NOT NULL DEFAULT 'intermediate' CHECK (vocab_level IN ('beginner', 'intermediate', 'advanced')),
  description TEXT,
  interrupt_level NUMERIC DEFAULT 0.3 CHECK (interrupt_level >= 0 AND interrupt_level <= 1),
  agreeability NUMERIC DEFAULT 0 CHECK (agreeability >= -1 AND agreeability <= 1),
  voice_name TEXT DEFAULT 'alloy',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_personas ENABLE ROW LEVEL SECURITY;

-- Users can only view their own custom personas
CREATE POLICY "Users can view own custom personas"
ON public.custom_personas
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own custom personas
CREATE POLICY "Users can create own custom personas"
ON public.custom_personas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom personas
CREATE POLICY "Users can update own custom personas"
ON public.custom_personas
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own custom personas
CREATE POLICY "Users can delete own custom personas"
ON public.custom_personas
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_custom_personas_updated_at
BEFORE UPDATE ON public.custom_personas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();