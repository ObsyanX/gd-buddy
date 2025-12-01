import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SessionSetupProps {
  topic: any;
  onSessionCreated: (sessionId: string) => void;
  onBack: () => void;
}

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
    description: 'Fact-driven, uses statistics and logic'
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
    description: 'Seeks consensus, empathetic'
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
    description: 'Direct, confident, decisive'
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
    description: 'Innovative, brings unique perspectives'
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
    description: 'Challenges ideas, plays devil\'s advocate'
  },
  {
    id: 'technical',
    name: 'Karthik',
    role: 'Software Engineer',
    tone: 'technical',
    verbosity: 'concise',
    interrupt_level: 0.25,
    agreeability: 0,
    vocab_level: 'advanced',
    description: 'Technical focus, practical solutions'
  },
  {
    id: 'strategic',
    name: 'Ananya',
    role: 'Strategy Consultant',
    tone: 'strategic',
    verbosity: 'moderate',
    interrupt_level: 0.35,
    agreeability: 0.2,
    vocab_level: 'advanced',
    description: 'Big-picture thinking, long-term vision'
  },
  {
    id: 'supportive',
    name: 'Rahul',
    role: 'Team Lead',
    tone: 'supportive',
    verbosity: 'moderate',
    interrupt_level: 0.1,
    agreeability: 0.6,
    vocab_level: 'intermediate',
    description: 'Encourages participation, builds on ideas'
  },
  {
    id: 'skeptical',
    name: 'Neha',
    role: 'Researcher',
    tone: 'skeptical',
    verbosity: 'elaborate',
    interrupt_level: 0.3,
    agreeability: -0.3,
    vocab_level: 'advanced',
    description: 'Questions assumptions, evidence-based'
  },
  {
    id: 'pragmatic',
    name: 'Arjun',
    role: 'Operations Manager',
    tone: 'pragmatic',
    verbosity: 'concise',
    interrupt_level: 0.2,
    agreeability: 0.1,
    vocab_level: 'intermediate',
    description: 'Focuses on feasibility and implementation'
  }
];

const SessionSetup = ({ topic, onSessionCreated, onBack }: SessionSetupProps) => {
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['analytical', 'diplomatic']);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const togglePersona = (id: string) => {
    setSelectedPersonas(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const handleCreateSession = async () => {
    if (selectedPersonas.length === 0) {
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
          persona_vocab_level: 'intermediate'
        });

      if (userError) throw userError;

      // Create AI participants
      const aiParticipants = selectedPersonas.map((personaId, index) => {
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
          persona_vocab_level: persona.vocab_level
        };
      });

      const { error: participantsError } = await supabase
        .from('gd_participants')
        .insert(aiParticipants);

      if (participantsError) throw participantsError;

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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                SELECT AI PARTICIPANTS
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                Choose 1-5 AI participants • Selected: {selectedPersonas.length}/5
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {PERSONA_TEMPLATES.map((persona) => {
              const isSelected = selectedPersonas.includes(persona.id);
              return (
                <Card
                  key={persona.id}
                  className={`p-6 border-4 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-secondary' 
                      : 'border-border hover:shadow-md'
                  }`}
                  onClick={() => togglePersona(persona.id)}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      checked={isSelected}
                      className="mt-1 border-2"
                    />
                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="text-xl font-bold">{persona.name}</h4>
                        <p className="text-sm text-muted-foreground">{persona.role}</p>
                      </div>
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
            disabled={isCreating || selectedPersonas.length === 0}
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