import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ArrowLeft, Loader2, Sparkles, Bot, Lightbulb, Trash2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  PERSONA_TEMPLATES, 
  TOPIC_CATEGORY_INFO,
  detectTopicCategory,
  getRecommendedPersonaIds,
  PersonaTemplate
} from "@/config/personas";
import CustomPersonaForm from "@/components/CustomPersonaForm";

type CategoryFilter = 'all' | 'core' | 'extended' | 'recommended' | 'custom';

interface CustomPersona {
  id: string;
  name: string;
  role: string;
  core_perspective: string;
  tone: string;
  verbosity: string;
  vocab_level: string;
  description: string | null;
  interrupt_level: number;
  agreeability: number;
  voice_name: string;
}

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const MultiplayerSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const topic = location.state?.topic;
  const { user } = useAuth();
  const { toast } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedCustomPersonas, setSelectedCustomPersonas] = useState<string[]>([]);
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('recommended');

  // Guard: redirect if no topic
  useEffect(() => {
    if (!topic) {
      navigate('/multiplayer/topic', { replace: true });
    }
  }, [topic, navigate]);

  // Fetch custom personas
  const fetchCustomPersonas = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('custom_personas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching custom personas:', error);
      return;
    }
    
    setCustomPersonas(data || []);
  }, [user]);

  useEffect(() => {
    fetchCustomPersonas();
  }, [fetchCustomPersonas]);

  // Detect topic category and get recommendations
  const detectedCategory = useMemo(() => {
    if (!topic) return null;
    return detectTopicCategory(topic.title, topic.category);
  }, [topic]);

  const recommendedIds = useMemo(() => {
    if (!detectedCategory) return [];
    return getRecommendedPersonaIds(detectedCategory);
  }, [detectedCategory]);

  // Update selected personas when topic changes
  useEffect(() => {
    if (recommendedIds.length > 0) {
      setSelectedPersonas(recommendedIds.slice(0, 3));
      setSelectedCustomPersonas([]);
    } else {
      setSelectedPersonas(['aditya', 'priya']);
      setSelectedCustomPersonas([]);
    }
  }, [recommendedIds]);

  // Combined persona list for display
  const allPersonas = useMemo(() => {
    const customAsTemplates: PersonaTemplate[] = customPersonas.map(cp => ({
      id: `custom-${cp.id}`,
      name: cp.name,
      role: cp.role,
      corePerspective: cp.core_perspective,
      tone: cp.tone,
      verbosity: cp.verbosity as 'concise' | 'moderate' | 'elaborate',
      interrupt_level: cp.interrupt_level,
      agreeability: cp.agreeability,
      vocab_level: cp.vocab_level as 'beginner' | 'intermediate' | 'advanced',
      description: cp.description || '',
      voice_name: cp.voice_name,
      category: 'custom' as const
    }));
    return [...PERSONA_TEMPLATES, ...customAsTemplates];
  }, [customPersonas]);

  // Filter personas based on category
  const filteredPersonas = useMemo(() => {
    switch (categoryFilter) {
      case 'core':
        return allPersonas.filter(p => p.category === 'core');
      case 'extended':
        return allPersonas.filter(p => p.category === 'extended');
      case 'custom':
        return allPersonas.filter(p => p.category === 'custom');
      case 'recommended':
        if (recommendedIds.length > 0) {
          return allPersonas.filter(p => recommendedIds.includes(p.id));
        }
        return allPersonas.filter(p => p.category !== 'custom').slice(0, 6);
      default:
        return allPersonas;
    }
  }, [categoryFilter, recommendedIds, allPersonas]);

  const totalSelected = selectedPersonas.length + selectedCustomPersonas.length;

  const togglePersona = (id: string) => {
    if (id.startsWith('custom-')) {
      setSelectedCustomPersonas(prev => 
        prev.includes(id) 
          ? prev.filter(p => p !== id)
          : totalSelected < 3 ? [...prev, id] : prev
      );
    } else {
      setSelectedPersonas(prev => 
        prev.includes(id) 
          ? prev.filter(p => p !== id)
          : totalSelected < 3 ? [...prev, id] : prev
      );
    }
  };

  const isSelected = (id: string) => {
    return id.startsWith('custom-') 
      ? selectedCustomPersonas.includes(id)
      : selectedPersonas.includes(id);
  };

  const handleDeleteCustomPersona = async (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const actualId = personaId.replace('custom-', '');
    
    const { error } = await supabase
      .from('custom_personas')
      .delete()
      .eq('id', actualId);
    
    if (error) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedCustomPersonas(prev => prev.filter(id => id !== personaId));
    fetchCustomPersonas();
    toast({
      title: "Participant deleted",
      description: "Custom AI participant has been removed",
    });
  };

  const applyRecommendation = () => {
    if (recommendedIds.length > 0) {
      setSelectedPersonas(recommendedIds.slice(0, 3));
      setSelectedCustomPersonas([]);
      toast({
        title: "Recommended team applied",
        description: `Selected ${Math.min(recommendedIds.length, 3)} optimal participants`,
      });
    }
  };

  const createRoomWithSettings = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a multiplayer room",
        variant: "destructive"
      });
      return;
    }
    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please select a topic first",
        variant: "destructive"
      });
      return;
    }
    setIsCreating(true);
    try {
      const roomCode = generateRoomCode();

      // Create multiplayer session with topic
      const { data: session, error } = await supabase.from('gd_sessions').insert({
        user_id: user.id,
        host_user_id: user.id,
        topic: topic.title,
        topic_category: topic.category || 'Custom',
        topic_difficulty: topic.difficulty || 'medium',
        topic_tags: topic.tags || [],
        is_multiplayer: true,
        room_code: roomCode,
        status: 'setup'
      }).select().single();

      if (error) throw error;

      // Create host participant
      const { error: participantError } = await supabase.from('gd_participants').insert({
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

      // Create AI participants from default templates
      const defaultAiParticipants = selectedPersonas.map((personaId, index) => {
        const persona = PERSONA_TEMPLATES.find(p => p.id === personaId)!;
        return {
          session_id: session.id,
          is_user: false,
          order_index: 100 + index,
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

      // Create AI participants from custom personas
      const customAiParticipants = selectedCustomPersonas.map((personaId, index) => {
        const actualId = personaId.replace('custom-', '');
        const persona = customPersonas.find(p => p.id === actualId)!;
        return {
          session_id: session.id,
          is_user: false,
          order_index: 100 + selectedPersonas.length + index,
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

      const allAiParticipants = [...defaultAiParticipants, ...customAiParticipants];

      if (allAiParticipants.length > 0) {
        const { error: aiError } = await supabase.from('gd_participants').insert(allAiParticipants);
        if (aiError) throw aiError;
      }

      // Initialize metrics
      await supabase.from('gd_metrics').insert({
        session_id: session.id,
        filler_count: 0,
        total_words: 0
      });

      setCreatedRoomCode(roomCode);
      toast({
        title: "Room created!",
        description: `Share code ${roomCode} with your friends`
      });

      // Navigate to session after short delay
      setTimeout(() => navigate(`/session/${session.id}`), 1500);
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({
        title: "Failed to create room",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyRoomCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBack = () => {
    navigate('/multiplayer/topic');
  };

  if (!topic) {
    return null;
  }

  // Show room created view
  if (createdRoomCode) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-2xl">
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
              <Button variant="outline" size="icon" onClick={copyRoomCode} className="border-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Redirecting to session...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleBack} className="border-2">
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
            <h2 className="text-xl font-bold">{topic?.title}</h2>
            <div className="flex gap-2">
              <Badge variant="secondary">{topic?.category}</Badge>
              <Badge variant="outline">{topic?.difficulty}</Badge>
            </div>
          </div>
        </Card>

        {/* Recommended Combination Panel */}
        {detectedCategory && (
          <Card className="p-4 border-4 border-primary/30 bg-primary/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    RECOMMENDED FOR {TOPIC_CATEGORY_INFO[detectedCategory].label.toUpperCase()}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Best participants: {recommendedIds.slice(0, 3).map(id => {
                      const p = PERSONA_TEMPLATES.find(persona => persona.id === id);
                      return p?.name;
                    }).filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={applyRecommendation}
                className="border-2 shrink-0"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Apply
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Bot className="w-5 h-5" />
                AI PARTICIPANTS (Optional)
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                Select 0-3 AI participants • Selected: {totalSelected}/3
              </p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {user && <CustomPersonaForm onPersonaCreated={fetchCustomPersonas} />}
              
              <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                <TabsList className="border-2 border-border">
                  {detectedCategory && (
                    <TabsTrigger value="recommended" className="text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Best
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="core" className="text-xs">Core</TabsTrigger>
                  <TabsTrigger value="extended" className="text-xs">Extended</TabsTrigger>
                  {customPersonas.length > 0 && (
                    <TabsTrigger value="custom" className="text-xs">
                      Custom ({customPersonas.length})
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={() => {
                setSelectedPersonas([]);
                setSelectedCustomPersonas([]);
              }} className="border-2">
                Clear
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {filteredPersonas.map(persona => {
              const selected = isSelected(persona.id);
              const isRecommended = recommendedIds.includes(persona.id);
              const isCustom = persona.category === 'custom';
              return (
                <Card 
                  key={persona.id} 
                  className={`p-4 border-4 cursor-pointer transition-all ${
                    selected 
                      ? 'border-primary bg-secondary' 
                      : isRecommended && categoryFilter !== 'recommended' 
                        ? 'border-primary/30 hover:shadow-md' 
                        : 'border-border hover:shadow-md'
                  }`} 
                  onClick={() => togglePersona(persona.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={selected} className="mt-1 border-2" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold">{persona.name}</h4>
                        <Badge 
                          variant={persona.category === 'core' ? 'default' : persona.category === 'custom' ? 'outline' : 'secondary'} 
                          className={`text-xs ${persona.category === 'custom' ? 'border-primary text-primary' : ''}`}
                        >
                          {persona.category}
                        </Badge>
                        {isRecommended && categoryFilter !== 'recommended' && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            <Sparkles className="w-2 h-2 mr-1" />
                            best
                          </Badge>
                        )}
                        {isCustom && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteCustomPersona(persona.id, e)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{persona.role}</p>
                      <p className="text-xs text-muted-foreground italic">{persona.corePerspective}</p>
                      <p className="text-xs">{persona.description}</p>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{persona.tone}</Badge>
                        <Badge variant="outline" className="text-xs">{persona.verbosity}</Badge>
                        <Badge variant="outline" className="text-xs">{persona.vocab_level}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleBack} className="border-2">
            BACK
          </Button>
          <Button size="lg" onClick={createRoomWithSettings} disabled={isCreating} className="border-4 border-border shadow-md">
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                CREATING ROOM...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                CREATE ROOM {totalSelected > 0 ? `(+ ${totalSelected} AI)` : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerSetup;
