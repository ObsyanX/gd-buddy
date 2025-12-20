import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Sparkles, Lightbulb, Trash2 } from "lucide-react";
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
import CustomPersonaForm from "./CustomPersonaForm";

interface SessionSetupProps {
  topic: any;
  onSessionCreated: (sessionId: string) => void;
  onBack: () => void;
}

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

type CategoryFilter = 'all' | 'core' | 'extended' | 'recommended' | 'custom';

const SessionSetup = ({ topic, onSessionCreated, onBack }: SessionSetupProps) => {
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedCustomPersonas, setSelectedCustomPersonas] = useState<string[]>([]);
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('recommended');
  const { user } = useAuth();
  const { toast } = useToast();

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
    return detectTopicCategory(topic.title, topic.category);
  }, [topic.title, topic.category]);

  const recommendedIds = useMemo(() => {
    if (!detectedCategory) return [];
    return getRecommendedPersonaIds(detectedCategory);
  }, [detectedCategory]);

  // Auto-select recommended personas on mount
  useEffect(() => {
    if (recommendedIds.length > 0) {
      setSelectedPersonas(recommendedIds.slice(0, 5));
    } else {
      setSelectedPersonas(['aditya', 'priya']);
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
        return allPersonas.filter(p => p.category !== 'custom');
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
          : totalSelected < 5 ? [...prev, id] : prev
      );
    } else {
      setSelectedPersonas(prev => 
        prev.includes(id) 
          ? prev.filter(p => p !== id)
          : totalSelected < 5 ? [...prev, id] : prev
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
      setSelectedPersonas(recommendedIds.slice(0, 5));
      toast({
        title: "Recommended team applied",
        description: `Selected ${Math.min(recommendedIds.length, 5)} optimal participants for this topic`,
      });
    }
  };

  const handleCreateSession = async () => {
    if (totalSelected === 0) {
      toast({
        title: "Select participants",
        description: "Choose at least one AI participant",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('gd_sessions')
        .insert({
          user_id: user?.id || null,
          topic: topic.title,
          topic_category: topic.category,
          topic_difficulty: topic.difficulty,
          topic_tags: topic.tags || [],
          status: 'setup'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create user participant
      const { error: userError } = await supabase
        .from('gd_participants')
        .insert({
          session_id: session.id,
          is_user: true,
          order_index: 0,
          persona_name: 'You',
          persona_tone: 'neutral',
          persona_verbosity: 'moderate',
          persona_vocab_level: 'intermediate',
          real_user_id: user?.id
        });

      if (userError) throw userError;

      // Create AI participants from default templates
      const defaultAiParticipants = selectedPersonas.map((personaId, index) => {
        const persona = PERSONA_TEMPLATES.find(p => p.id === personaId)!;
        return {
          session_id: session.id,
          is_user: false,
          order_index: index + 1,
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
          order_index: selectedPersonas.length + index + 1,
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
        const { error: participantsError } = await supabase
          .from('gd_participants')
          .insert(allAiParticipants);

        if (participantsError) throw participantsError;
      }

      // Initialize metrics
      const { error: metricsError } = await supabase
        .from('gd_metrics')
        .insert({
          session_id: session.id,
          filler_count: 0,
          total_words: 0
        });

      if (metricsError) throw metricsError;

      toast({
        title: "Session created",
        description: "Ready to start your practice discussion",
      });

      onSessionCreated(session.id);
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: "Failed to create session",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="border-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">SESSION SETUP</h1>
            <p className="text-muted-foreground font-mono">Configure your practice session</p>
          </div>
        </div>

        <Card className="p-6 border-4 border-border">
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground">TOPIC</label>
            <h2 className="text-2xl font-bold">{topic.title}</h2>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{topic.category}</Badge>
              <Badge variant="outline" className="border-2">{topic.difficulty}</Badge>
              {topic.tags?.slice(0, 3).map((tag: string, i: number) => (
                <Badge key={i} variant="outline">{tag}</Badge>
              ))}
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
                    <Badge variant="secondary" className="text-xs">
                      {TOPIC_CATEGORY_INFO[detectedCategory].description}
                    </Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optimal participants: {recommendedIds.map(id => {
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
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                SELECT AI PARTICIPANTS
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                Choose 1-5 AI participants • Selected: {totalSelected}/5
              </p>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {/* Create Custom AI Button */}
              {user && <CustomPersonaForm onPersonaCreated={fetchCustomPersonas} />}

              {/* Category Filter Tabs */}
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
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {filteredPersonas.map((persona) => {
              const selected = isSelected(persona.id);
              const isRecommended = recommendedIds.includes(persona.id);
              const isCustom = persona.category === 'custom';
              return (
                <Card
                  key={persona.id}
                  className={`p-6 border-4 cursor-pointer transition-all ${
                    selected 
                      ? 'border-primary bg-secondary' 
                      : isRecommended && categoryFilter !== 'recommended'
                        ? 'border-primary/30 hover:shadow-md'
                        : 'border-border hover:shadow-md'
                  }`}
                  onClick={() => togglePersona(persona.id)}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      checked={selected}
                      className="mt-1 border-2"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xl font-bold">{persona.name}</h4>
                        <Badge 
                          variant={persona.category === 'core' ? 'default' : persona.category === 'custom' ? 'outline' : 'secondary'} 
                          className={`text-xs ${persona.category === 'custom' ? 'border-primary text-primary' : ''}`}
                        >
                          {persona.category}
                        </Badge>
                        {isRecommended && categoryFilter !== 'recommended' && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            <Sparkles className="w-3 h-3 mr-1" />
                            recommended
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
                      <p className="text-sm text-muted-foreground">{persona.role}</p>
                      <p className="text-xs text-muted-foreground italic">{persona.corePerspective}</p>
                      <p className="text-sm">{persona.description}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {persona.tone}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {persona.verbosity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {persona.vocab_level}
                        </Badge>
                      </div>
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
            onClick={onBack}
            className="border-2"
          >
            BACK
          </Button>
          <Button
            size="lg"
            onClick={handleCreateSession}
            disabled={isCreating || totalSelected === 0}
            className="border-4 border-border shadow-md"
          >
            {isCreating ? "CREATING..." : "START DISCUSSION"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionSetup;
