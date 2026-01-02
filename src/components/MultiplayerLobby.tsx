import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface MultiplayerLobbyProps {
  onSessionJoined: (sessionId: string) => void;
  onBack: () => void;
  onCreateRoom: () => void;
}

const MultiplayerLobby = ({
  onSessionJoined,
  onBack,
  onCreateRoom
}: MultiplayerLobbyProps) => {
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Enter room code",
        description: "Please enter a valid room code",
        variant: "destructive"
      });
      return;
    }
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join a multiplayer room",
        variant: "destructive"
      });
      return;
    }
    setIsJoining(true);
    try {
      const normalizedCode = joinCode.toUpperCase().trim();
      console.log('Searching for room with code:', normalizedCode);

      // Find session by room code
      const { data: sessions, error: sessionError } = await supabase
        .from('gd_sessions')
        .select('*')
        .eq('room_code', normalizedCode)
        .eq('is_multiplayer', true);

      console.log('Session search result:', sessions, sessionError);

      if (sessionError) {
        console.error('Session query error:', sessionError);
        throw new Error('Could not search for room. Please try again.');
      }
      if (!sessions || sessions.length === 0) {
        throw new Error('Room not found. Check the code and try again.');
      }

      const session = sessions[0];
      if (session.status === 'completed') {
        throw new Error('This session has already ended.');
      }

      // Check if already joined
      const { data: existingParticipant } = await supabase
        .from('gd_participants')
        .select('*')
        .eq('session_id', session.id)
        .eq('real_user_id', user.id)
        .maybeSingle();

      if (existingParticipant) {
        console.log('Already joined, navigating to session');
        onSessionJoined(session.id);
        return;
      }

      // Get current participant count for order_index
      const { data: participants } = await supabase
        .from('gd_participants')
        .select('*')
        .eq('session_id', session.id)
        .eq('is_user', true);

      const humanCount = participants?.length || 1;

      // Add as participant
      const { error: participantError } = await supabase
        .from('gd_participants')
        .insert({
          session_id: session.id,
          is_user: true,
          real_user_id: user.id,
          order_index: humanCount,
          persona_name: user.email?.split('@')[0] || `Player ${humanCount + 1}`,
          persona_tone: 'neutral',
          persona_verbosity: 'moderate',
          persona_vocab_level: 'intermediate'
        });

      if (participantError) {
        console.error('Participant insert error:', participantError);
        throw new Error('Could not join room. Please try again.');
      }

      toast({
        title: "Joined room!",
        description: "Connecting to the discussion..."
      });

      onSessionJoined(session.id);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast({
        title: "Failed to join room",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="border-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">MULTIPLAYER MODE</h1>
            <p className="text-muted-foreground font-mono">Practice with friends in real-time</p>
          </div>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 border-2 border-border">
            <TabsTrigger value="create" className="font-bold">CREATE ROOM</TabsTrigger>
            <TabsTrigger value="join" className="font-bold">JOIN ROOM</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="mt-4">
            <Card className="p-0 border-4 border-border space-y-6">
              <div className="text-center space-y-2">
                <Users className="w-12 h-12 mx-auto" />
                <h2 className="text-xl font-bold">CREATE A NEW ROOM</h2>
                <p className="text-sm text-muted-foreground">
                  Start a multiplayer session and invite friends to join
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border-2 border-border rounded space-y-2">
                  <h3 className="font-bold text-sm">HOW IT WORKS</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Choose a topic (AI-generated or custom)</li>
                    <li>• Optionally add AI participants</li>
                    <li>• You'll get a 6-character room code</li>
                    <li>• Share the code with your friends</li>
                    <li>• Everyone joins and discusses in real-time!</li>
                  </ul>
                </div>
              </div>

              <Button onClick={onCreateRoom} size="lg" className="w-full border-4 border-border text-xs text-center">
                SELECT TOPIC & CREATE ROOM
              </Button>
            </Card>
          </TabsContent>
          
          <TabsContent value="join" className="mt-4">
            <Card className="p-6 border-4 border-border space-y-6">
              <div className="text-center space-y-2">
                <Users className="w-12 h-12 mx-auto" />
                <h2 className="text-xl font-bold">JOIN A ROOM</h2>
                <p className="text-sm text-muted-foreground">
                  Enter the room code shared by your friend
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">ROOM CODE</Label>
                  <Input 
                    placeholder="Enter 6-character code" 
                    value={joinCode} 
                    onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                    className="border-2 text-center text-2xl font-mono tracking-widest uppercase" 
                    maxLength={6} 
                  />
                </div>
              </div>

              <Button 
                onClick={handleJoinRoom} 
                disabled={isJoining || joinCode.length < 6} 
                className="w-full border-4 border-border" 
                size="lg"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    JOINING...
                  </>
                ) : 'JOIN ROOM'}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MultiplayerLobby;
