import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Copy, Check, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface MultiplayerLobbyProps {
  onSessionJoined: (sessionId: string) => void;
  onBack: () => void;
}

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const MultiplayerLobby = ({ onSessionJoined, onBack }: MultiplayerLobbyProps) => {
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTopicSelection, setShowTopicSelection] = useState(false);
  const [topicMode, setTopicMode] = useState<'generate' | 'custom'>('generate');
  const [customTopic, setCustomTopic] = useState("");
  const [generatedTopics, setGeneratedTopics] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGenerateTopics = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('gd-topics', {
        body: {
          audience: 'engineering students',
          tone: 'formal',
          difficulty: 'medium',
          count: 6
        }
      });

      if (error) throw error;

      setGeneratedTopics(data.topics || []);
      toast({
        title: "Topics generated",
        description: "Choose one to start your multiplayer session",
      });
    } catch (error: any) {
      console.error('Error generating topics:', error);
      toast({
        title: "Failed to generate topics",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const createRoomWithTopic = async (topic: { title: string; category?: string; difficulty?: string; tags?: string[] }) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a multiplayer room",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const roomCode = generateRoomCode();
      
      // Create multiplayer session with topic
      const { data: session, error } = await supabase
        .from('gd_sessions')
        .insert({
          user_id: user.id,
          host_user_id: user.id,
          topic: topic.title,
          topic_category: topic.category || 'Custom',
          topic_difficulty: topic.difficulty || 'medium',
          topic_tags: topic.tags || [],
          is_multiplayer: true,
          room_code: roomCode,
          status: 'setup'
        })
        .select()
        .single();

      if (error) throw error;

      // Create host participant
      const { error: participantError } = await supabase
        .from('gd_participants')
        .insert({
          session_id: session.id,
          is_user: true,
          real_user_id: user.id,
          order_index: 0,
          persona_name: 'You (Host)',
          persona_tone: 'neutral',
          persona_verbosity: 'moderate',
          persona_vocab_level: 'intermediate'
        });

      if (participantError) throw participantError;

      setCreatedRoomCode(roomCode);
      
      toast({
        title: "Room created!",
        description: `Share code ${roomCode} with your friends`,
      });

      // Navigate to session after short delay
      setTimeout(() => onSessionJoined(session.id), 1500);
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({
        title: "Failed to create room",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateRoom = () => {
    setShowTopicSelection(true);
  };

  const handleTopicSelected = (topic: any) => {
    createRoomWithTopic(topic);
  };

  const handleCustomTopicSubmit = () => {
    if (!customTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a discussion topic",
        variant: "destructive",
      });
      return;
    }

    createRoomWithTopic({
      title: customTopic,
      category: 'Custom',
      difficulty: 'medium',
      tags: []
    });
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Enter room code",
        description: "Please enter a valid room code",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join a multiplayer room",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      // Find session by room code
      const { data: session, error: sessionError } = await supabase
        .from('gd_sessions')
        .select('*')
        .eq('room_code', joinCode.toUpperCase().trim())
        .eq('is_multiplayer', true)
        .single();

      if (sessionError || !session) {
        throw new Error('Room not found. Check the code and try again.');
      }

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
        // Already joined, just go to session
        onSessionJoined(session.id);
        return;
      }

      // Get current participant count for order_index
      const { count } = await supabase
        .from('gd_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id);

      // Add as participant
      const { error: participantError } = await supabase
        .from('gd_participants')
        .insert({
          session_id: session.id,
          is_user: true,
          real_user_id: user.id,
          order_index: count || 1,
          persona_name: `Player ${(count || 0) + 1}`,
          persona_tone: 'neutral',
          persona_verbosity: 'moderate',
          persona_vocab_level: 'intermediate'
        });

      if (participantError) throw participantError;

      toast({
        title: "Joined room!",
        description: "Connecting to the discussion...",
      });

      onSessionJoined(session.id);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast({
        title: "Failed to join room",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const copyRoomCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Topic Selection View
  if (showTopicSelection && !createdRoomCode) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setShowTopicSelection(false)} className="border-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold">SELECT TOPIC</h1>
              <p className="text-muted-foreground font-mono">Choose a topic for your multiplayer session</p>
            </div>
          </div>

          <Tabs value={topicMode} onValueChange={(v) => setTopicMode(v as 'generate' | 'custom')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 border-2 border-border">
              <TabsTrigger value="generate" className="font-bold">AI GENERATED</TabsTrigger>
              <TabsTrigger value="custom" className="font-bold">CUSTOM TOPIC</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6 mt-4">
              {generatedTopics.length === 0 ? (
                <Card className="p-12 border-4 border-border text-center space-y-4">
                  <Sparkles className="w-16 h-16 mx-auto text-muted-foreground" />
                  <h3 className="text-2xl font-bold">GENERATE TOPICS</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Let AI create engaging discussion topics for your multiplayer session
                  </p>
                  <Button 
                    size="lg" 
                    onClick={handleGenerateTopics}
                    disabled={isGenerating}
                    className="border-4 border-border shadow-md"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        GENERATING...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        GENERATE TOPICS
                      </>
                    )}
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-mono text-muted-foreground">
                      {generatedTopics.length} topics generated
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleGenerateTopics}
                      disabled={isGenerating}
                      className="border-2"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "REGENERATE"}
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    {generatedTopics.map((topic, index) => (
                      <Card 
                        key={index} 
                        className="p-6 border-4 border-border hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleTopicSelected(topic)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-xl font-bold flex-1">{topic.title}</h3>
                            <Badge variant="outline" className="border-2">
                              {topic.difficulty}
                            </Badge>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="secondary">{topic.category}</Badge>
                            {topic.tags?.slice(0, 3).map((tag: string, i: number) => (
                              <Badge key={i} variant="outline">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 mt-4">
              <Card className="p-8 border-4 border-border space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">ENTER YOUR TOPIC</Label>
                  <Input
                    placeholder="e.g., Impact of AI on employment in the next decade"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="border-2 text-lg"
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomTopicSubmit()}
                  />
                  <p className="text-xs text-muted-foreground font-mono">
                    Enter a clear, debate-worthy topic for group discussion
                  </p>
                </div>
                <Button 
                  size="lg" 
                  onClick={handleCustomTopicSubmit}
                  disabled={isCreating}
                  className="w-full border-4 border-border shadow-md"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      CREATING ROOM...
                    </>
                  ) : (
                    'CREATE ROOM WITH THIS TOPIC'
                  )}
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

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

        {createdRoomCode ? (
          <Card className="p-8 border-4 border-border text-center space-y-6">
            <div className="space-y-2">
              <Users className="w-16 h-16 mx-auto" />
              <h2 className="text-2xl font-bold">ROOM CREATED!</h2>
              <p className="text-muted-foreground">Share this code with your friends</p>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <div className="text-5xl font-bold font-mono tracking-widest border-4 border-border p-4">
                {createdRoomCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyRoomCode}
                className="border-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Redirecting to session...
            </p>
          </Card>
        ) : (
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 border-2 border-border">
              <TabsTrigger value="create" className="font-bold">CREATE ROOM</TabsTrigger>
              <TabsTrigger value="join" className="font-bold">JOIN ROOM</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="mt-4">
              <Card className="p-6 border-4 border-border space-y-6">
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
                      <li>• You'll get a 6-character room code</li>
                      <li>• Share the code with your friends</li>
                      <li>• Everyone joins and discusses in real-time!</li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full border-4 border-border"
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      CREATING...
                    </>
                  ) : (
                    'SELECT TOPIC & CREATE ROOM'
                  )}
                </Button>
              </Card>
            </TabsContent>
            
            <TabsContent value="join" className="mt-4">
              <Card className="p-6 border-4 border-border space-y-6">
                <div className="text-center space-y-2">
                  <Users className="w-12 h-12 mx-auto" />
                  <h2 className="text-xl font-bold">JOIN EXISTING ROOM</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter the room code shared by your friend
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomCode">ROOM CODE</Label>
                    <Input
                      id="roomCode"
                      placeholder="Enter 6-character code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="text-center text-2xl font-mono tracking-widest border-4"
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
                  ) : (
                    'JOIN ROOM'
                  )}
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="text-center text-sm text-muted-foreground font-mono">
          <Badge variant="outline" className="border-2">
            Multiplayer sessions sync in real-time
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;