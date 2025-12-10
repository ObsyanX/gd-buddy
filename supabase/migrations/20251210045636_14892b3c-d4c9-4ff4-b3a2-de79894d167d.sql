-- Add video metrics columns to gd_metrics
ALTER TABLE gd_metrics 
ADD COLUMN IF NOT EXISTS posture_score integer,
ADD COLUMN IF NOT EXISTS eye_contact_score integer,
ADD COLUMN IF NOT EXISTS expression_score integer,
ADD COLUMN IF NOT EXISTS video_tips jsonb;

-- Add multiplayer support columns to gd_sessions
ALTER TABLE gd_sessions 
ADD COLUMN IF NOT EXISTS room_code text UNIQUE,
ADD COLUMN IF NOT EXISTS is_multiplayer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id);

-- Add real user reference to participants for multiplayer
ALTER TABLE gd_participants
ADD COLUMN IF NOT EXISTS real_user_id uuid;

-- Create index for room code lookups
CREATE INDEX IF NOT EXISTS idx_gd_sessions_room_code ON gd_sessions(room_code) WHERE room_code IS NOT NULL;

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.gd_messages;

-- Enable realtime for sessions (for multiplayer lobby)
ALTER PUBLICATION supabase_realtime ADD TABLE public.gd_sessions;

-- Enable realtime for participants (for multiplayer presence)
ALTER PUBLICATION supabase_realtime ADD TABLE public.gd_participants;