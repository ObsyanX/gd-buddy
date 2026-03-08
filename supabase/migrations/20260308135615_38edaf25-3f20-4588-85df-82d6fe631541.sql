-- Ranked multiplayer: user_rankings table
CREATE TABLE public.user_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  elo_rating INTEGER NOT NULL DEFAULT 1000,
  tier TEXT NOT NULL DEFAULT 'bronze',
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  total_matches INTEGER NOT NULL DEFAULT 0,
  best_rating INTEGER NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_rankings ENABLE ROW LEVEL SECURITY;

-- Users can view all rankings (leaderboard is public)
CREATE POLICY "Anyone can view rankings"
  ON public.user_rankings FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own ranking row
CREATE POLICY "Users can insert own ranking"
  ON public.user_rankings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own ranking
CREATE POLICY "Users can update own ranking"
  ON public.user_rankings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_rankings_updated_at
  BEFORE UPDATE ON public.user_rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index for leaderboard queries
CREATE INDEX idx_user_rankings_elo ON public.user_rankings(elo_rating DESC);
CREATE INDEX idx_user_rankings_tier ON public.user_rankings(tier);