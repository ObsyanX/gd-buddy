import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Target, Clock, Mic, Square, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/supabase-auth";
import { useStreamingTranscription } from "@/hooks/useStreamingTranscription";

interface DrillType {
  id: string;
  name: string;
  description: string;
  timeLimit: number;
  icon: any;
}

const DRILL_TYPES: DrillType[] = [
  {
    id: 'opening_statement',
    name: 'Opening Statement',
    description: 'Deliver a strong 30-60 second opening to establish your position',
    timeLimit: 60,
    icon: Target
  },
  {
    id: 'star_response',
    name: 'STAR Response',
    description: 'Structure your answer using Situation-Task-Action-Result framework',
    timeLimit: 120,
    icon: CheckCircle2
  },
  {
    id: 'rebuttal',
    name: 'Rebuttal & Counterpoint',
    description: 'Practice disagreeing professionally and building counterarguments',
    timeLimit: 45,
    icon: XCircle
  },
  {
    id: 'time_boxed',
    name: 'Time-Boxed Speaking',
    description: 'Practice speaking concisely within strict time limits',
    timeLimit: 30,
    icon: Clock
  }
];

const SAMPLE_TOPICS = [
  "Remote work vs office work for productivity",
  "Impact of social media on mental health",
  "Should companies prioritize diversity hiring",
  "Is AI replacing human jobs a concern",
  "Benefits of work-life balance policies"
];

const SkillDrills = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDrill, setSelectedDrill] = useState<DrillType | null>(null);
  const [topic, setTopic] = useState("");
  const [userResponse, setUserResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Voice input using streaming transcription
  const {
    isListening,
    isSupported: isSpeechSupported,
    isCorrecting,
    startListening,
    stopListening,
    clearTranscription
  } = useStreamingTranscription({
    context: topic,
    onInterimResult: (text) => setUserResponse(text),
    onFinalResult: (text) => setUserResponse(text),
  });

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      clearTranscription();
      startListening();
    }
  };

  const handleSelectDrill = (drill: DrillType) => {
    setSelectedDrill(drill);
    setTopic(SAMPLE_TOPICS[Math.floor(Math.random() * SAMPLE_TOPICS.length)]);
    setUserResponse("");
    setFeedback(null);
    setTimeRemaining(null);
  };

  const handleSubmitResponse = async () => {
    if (!userResponse.trim() || !selectedDrill) {
      toast({
        title: "Response required",
        description: "Please provide your response",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Get AI feedback
      const { data: feedbackData, error: feedbackError } = await invokeWithAuth('drill-feedback', {
        body: {
          drill_type: selectedDrill.id,
          topic,
          user_response: userResponse,
          time_limit_seconds: selectedDrill.timeLimit
        }
      });

      if (feedbackError) throw feedbackError;

      setFeedback(feedbackData);

      // Save drill to database
      const { error: saveError } = await supabase
        .from('skill_drills')
        .insert({
          user_id: user?.id || null,
          drill_type: selectedDrill.id as any,
          topic,
          user_response: userResponse,
          ai_feedback: JSON.stringify(feedbackData),
          score: feedbackData.score,
          completed_at: new Date().toISOString(),
          time_limit_seconds: selectedDrill.timeLimit
        });

      if (saveError) throw saveError;

      toast({
        title: "Drill completed!",
        description: `Score: ${feedbackData.score}%`,
      });

    } catch (error: any) {
      console.error('Error processing drill:', error);
      toast({
        title: "Error processing drill",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedDrill(null);
    setTopic("");
    setUserResponse("");
    setFeedback(null);
    setTimeRemaining(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")} className="border-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">SKILL DRILLS</h1>
            <p className="text-muted-foreground font-mono">Focused exercises for specific skills</p>
          </div>
        </div>

        {!selectedDrill ? (
          <div className="grid md:grid-cols-2 gap-6">
            {DRILL_TYPES.map((drill) => {
              const Icon = drill.icon;
              return (
                <Card 
                  key={drill.id}
                  className="p-6 border-4 border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectDrill(drill)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-bold">{drill.name}</h3>
                        <Badge variant="outline" className="mt-2 border-2">
                          <Clock className="w-3 h-3 mr-1" />
                          {drill.timeLimit}s
                        </Badge>
                      </div>
                      <Icon className="w-8 h-8" />
                    </div>
                    <p className="text-muted-foreground">{drill.description}</p>
                    <Button className="w-full border-4 border-border shadow-sm">
                      START DRILL
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="p-6 border-4 border-border">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{selectedDrill.name}</h2>
                  <Badge variant="outline" className="border-2">
                    <Clock className="w-4 h-4 mr-2" />
                    {selectedDrill.timeLimit}s limit
                  </Badge>
                </div>
                <div className="p-4 border-2 border-border bg-secondary">
                  <p className="text-sm font-bold text-muted-foreground mb-1">TOPIC</p>
                  <p className="text-lg font-bold">{topic}</p>
                </div>
                <p className="text-sm text-muted-foreground">{selectedDrill.description}</p>
              </div>
            </Card>

            {!feedback ? (
              <Card className="p-6 border-4 border-border space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold">YOUR RESPONSE</label>
                    {isCorrecting && (
                      <span className="text-xs text-muted-foreground animate-pulse">Correcting...</span>
                    )}
                  </div>
                  <div className="relative">
                    <Textarea
                      placeholder="Type or record your response here..."
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      className="border-2 min-h-[200px] text-base pr-14"
                    />
                    {isSpeechSupported && (
                      <Button
                        type="button"
                        size="icon"
                        variant={isListening ? "default" : "outline"}
                        onClick={toggleVoiceInput}
                        className={`absolute right-2 top-2 border-2 ${isListening ? 'bg-destructive hover:bg-destructive/90 animate-pulse' : ''}`}
                        disabled={isProcessing}
                      >
                        {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Aim for {selectedDrill.timeLimit} seconds worth of content
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-2"
                  >
                    CANCEL
                  </Button>
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={isProcessing || !userResponse.trim()}
                    className="flex-1 border-4 border-border shadow-md"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        GETTING FEEDBACK...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        SUBMIT FOR FEEDBACK
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-8 border-4 border-border text-center space-y-4">
                  <div className="text-6xl font-bold">{feedback.score}%</div>
                  <p className="text-2xl font-bold">DRILL SCORE</p>
                  <Progress value={feedback.score} className="h-4 border-2 border-border" />
                </Card>

                {feedback.strengths && (
                  <Card className="p-6 border-4 border-border space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      STRENGTHS
                    </h3>
                    <ul className="space-y-2">
                      {feedback.strengths.map((strength: string, i: number) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="text-green-600">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {feedback.improvements && (
                  <Card className="p-6 border-4 border-border space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <XCircle className="w-6 h-6 text-destructive" />
                      AREAS TO IMPROVE
                    </h3>
                    <ul className="space-y-2">
                      {feedback.improvements.map((improvement: string, i: number) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="text-destructive">•</span>
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {feedback.specific_tip && (
                  <Card className="p-6 border-4 border-border space-y-2">
                    <h3 className="text-xl font-bold">NEXT STEP</h3>
                    <p className="text-muted-foreground">{feedback.specific_tip}</p>
                  </Card>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-2"
                  >
                    TRY DIFFERENT DRILL
                  </Button>
                  <Button
                    onClick={() => {
                      setFeedback(null);
                      setUserResponse("");
                      setTopic(SAMPLE_TOPICS[Math.floor(Math.random() * SAMPLE_TOPICS.length)]);
                    }}
                    className="flex-1 border-4 border-border shadow-md"
                  >
                    PRACTICE AGAIN
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillDrills;