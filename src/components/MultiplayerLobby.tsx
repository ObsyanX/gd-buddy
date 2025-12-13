import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Copy, Check, ArrowLeft, Loader2, Sparkles, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/supabase-auth";

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

const PERSONA_TEMPLATES = [
  {
    id: 'analytical',
    name: 'Aditya',
    role: 'Data Analyst',
    tone: 'analytical',
    verbosity: 'moderate',
    interrupt_level: 0.2,
    agreeability: 0.1,
    vocab_level: 'advanced',
    description: 'Fact-driven, uses statistics',
    voice_name: 'roger'
  },
  {
    id: 'diplomatic',
    name: 'Priya',
    role: 'HR Manager',
    tone: 'diplomatic',
    verbosity: 'moderate',
    interrupt_level: 0.15,
    agreeability: 0.5,
    vocab_level: 'intermediate',
    description: 'Seeks consensus, empathetic',
    voice_name: 'sarah'
  },
  {
    id: 'assertive',
    name: 'Rohan',
    role: 'Business Lead',
    tone: 'assertive',
    verbosity: 'concise',
    interrupt_level: 0.5,
    agreeability: -0.2,
    vocab_level: 'advanced',
    description: 'Direct, confident, decisive',
    voice_name: 'george'
  },
  {
    id: 'creative',
    name: 'Meera',
    role: 'Designer',
    tone: 'enthusiastic',
    verbosity: 'elaborate',
    interrupt_level: 0.3,
    agreeability: 0.3,
    vocab_level: 'intermediate',
    description: 'Innovative perspectives',
    voice_name: 'aria'
  },
  {
    id: 'devil-advocate',
    name: 'Vikram',
    role: 'Legal Counsel',
    tone: 'critical',
    verbosity: 'moderate',
    interrupt_level: 0.4,
    agreeability: -0.4,
    vocab_level: 'advanced',
    description: 'Challenges ideas',
    voice_name: 'daniel'
  }
];

const MultiplayerLobby = ({ onSessionJoined, onBack }: MultiplayerLobbyProps) => {
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTopicSelection, setShowTopicSelection] = useState(false);
  const [showAISelection, setShowAISelection] = useState(false);
  const [topicMode, setTopicMode] = useState<'generate' | 'custom'>('generate');
  const [customTopic, setCustomTopic] = useState("");
  const [generatedTopics, setGeneratedTopics] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['analytical', 'diplomatic']);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGenerateTopics = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await invokeWithAuth('gd-topics', {
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

  const togglePersona = (id: string) => {
    setSelectedPersonas(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleTopicSelected = (topic: any) => {
    setSelectedTopic(topic);
    setShowAISelection(true);
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

    handleTopicSelected({
      title: customTopic,
      category: 'Custom',
      difficulty: 'medium',
      tags: []
    });
  };

  const createRoomWithSettings = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a multiplayer room",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTopic) {
      toast({
        title: "Topic required",
        description: "Please select a topic first",
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
          topic: selectedTopic.title,
          topic_category: selectedTopic.category || 'Custom',
          topic_difficulty: selectedTopic.difficulty || 'medium',
          topic_tags: selectedTopic.tags || [],
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

      // Create AI participants if selected
      if (selectedPersonas.length > 0) {
        const aiParticipants = selectedPersonas.map((personaId, index) => {
          const persona = PERSONA_TEMPLATES.find(p => p.id === personaId)!;
          return {
            session_id: session.id,
            is_user: false,
            order_index: 100 + index, // High index for AI participants
            persona_name: persona.name,
            persona_role: persona.role,
            persona_tone: persona.tone,
            persona_verbosity: persona.verbosity,
            persona_interrupt_level: persona.interrupt_level,
            persona_agreeability: persona.agreeability,
            persona_vocab_level: persona.vocab_level,
            voice_name: persona.voice_name
          };
        });

        const { error: aiError } = await supabase
          .from('gd_participants')
          .insert(aiParticipants);

        if (aiError) throw aiError;
      }

      // Initialize metrics
      await supabase
        .from('gd_metrics')
        .insert({
          session_id: session.id,
          filler_count: 0,
          total_words: 0
        });

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
      const normalizedCode = joinCode.toUpperCase().trim();
      console.log('Searching for room with code:', normalizedCode);
      
      // Find session by room code - use RPC or direct query with proper handling
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

  // AI Selection View
  if (showAISelection) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setShowAISelection(false)} className="border-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold">ADD AI PARTICIPANTS</h1>
              <p className="text-muted-foreground font-mono">Optional: Add AI participants to join the discussion</p>
            </div>
          </div>

          <Card className="p-6 border-4 border-border">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">SELECTED TOPIC</label>
              <h2 className="text-xl font-bold">{selectedTopic?.title}</h2>
              <div className="flex gap-2">
                <Badge variant="secondary">{selectedTopic?.category}</Badge>
                <Badge variant="outline">{selectedTopic?.difficulty}</Badge>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  AI PARTICIPANTS (Optional)
                </h3>
                <p className="text-sm text-muted-foreground font-mono">
                  Select 0-3 AI participants • Selected: {selectedPersonas.length}/3
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedPersonas([])}
                className="border-2"
              >
                Clear All
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {PERSONA_TEMPLATES.map((persona) => {
                const isSelected = selectedPersonas.includes(persona.id);
                return (
                  <Card
                    key={persona.id}
                    className={`p-4 border-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary bg-secondary' 
                        : 'border-border hover:shadow-md'
                    }`}
                    onClick={() => togglePersona(persona.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={isSelected}
                        className="mt-1 border-2"
                      />
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold">{persona.name}</h4>
                        <p className="text-xs text-muted-foreground">{persona.role}</p>
                        <p className="text-xs">{persona.description}</p>
                        <Badge variant="outline" className="text-xs">{persona.tone}</Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowAISelection(false)}
              className="border-2"
            >
              BACK
            </Button>
            <Button
              size="lg"
              onClick={createRoomWithSettings}
              disabled={isCreating}
              className="border-4 border-border shadow-md"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  CREATING ROOM...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  CREATE ROOM {selectedPersonas.length > 0 ? `(+ ${selectedPersonas.length} AI)` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                  disabled={!customTopic.trim()}
                  className="w-full border-4 border-border shadow-md"
                >
                  CONTINUE WITH THIS TOPIC
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
                      <li>• Optionally add AI participants</li>
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
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
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
                  ) : (
                    'JOIN ROOM'
                  )}
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default MultiplayerLobby;
