import { useState, useEffect, useRef, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Mic, Square, Send, Loader2, CheckCircle2, XCircle, Plus, Trash2, TimerIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/supabase-auth";
import { useStreamingTranscription } from "@/hooks/useStreamingTranscription";
import { BUILT_IN_DRILLS, SCENARIO_DRILLS, SAMPLE_TOPICS, getCustomDrillsFromLocalStorage, clearLocalStorageDrills, getApiDrillType, type DrillType } from "@/config/drill-types";
import { Target } from "lucide-react";
import CreateDrillModal from "@/components/CreateDrillModal";
import DrillHistory from "@/components/DrillHistory";
import { updateSkillProgress } from "@/components/SkillProgressWidget";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const SkillDrills = () => {
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDrill, setSelectedDrill] = useState<DrillType | null>(null);
  const [topic, setTopic] = useState("");
  const [userResponse, setUserResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [customDrills, setCustomDrills] = useState<DrillType[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [drillToDelete, setDrillToDelete] = useState<DrillType | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load custom drills from DB + migrate localStorage drills
  useEffect(() => {
    if (!user) return;
    const loadDrills = async () => {
      // Fetch from DB
      const { data, error } = await supabase
        .from('custom_drills')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading custom drills:', error);
        return;
      }

      const dbDrills: DrillType[] = (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description || '',
        prompt: d.prompt || undefined,
        timeLimit: d.time_limit,
        difficulty: d.difficulty || undefined,
        icon: Target,
        type: 'custom' as const,
      }));

      // Migrate localStorage drills if any
      const localDrills = getCustomDrillsFromLocalStorage();
      if (localDrills.length > 0) {
        const toInsert = localDrills.map(d => ({
          user_id: user.id,
          name: d.name,
          description: d.description,
          prompt: d.prompt || null,
          time_limit: d.timeLimit,
          difficulty: d.difficulty || 'medium',
        }));
        const { data: inserted, error: insertError } = await supabase
          .from('custom_drills')
          .insert(toInsert)
          .select();

        if (!insertError && inserted) {
          clearLocalStorageDrills();
          const migratedDrills: DrillType[] = inserted.map((d: any) => ({
            id: d.id,
            name: d.name,
            description: d.description || '',
            prompt: d.prompt || undefined,
            timeLimit: d.time_limit,
            difficulty: d.difficulty || undefined,
            icon: Target,
            type: 'custom' as const,
          }));
          setCustomDrills([...dbDrills, ...migratedDrills]);
          return;
        }
      }

      setCustomDrills(dbDrills);
    };
    loadDrills();
  }, [user]);

  const allDrills = [...BUILT_IN_DRILLS, ...SCENARIO_DRILLS, ...customDrills];

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
    onFinalResult: (text) => setUserResponse(text)
  });

  // Timer logic
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerActive(false);
  }, []);

  const startTimer = useCallback((duration: number) => {
    stopTimer();
    setTimeRemaining(duration);
    setTimerActive(true);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  // Auto-stop when timer hits zero
  useEffect(() => {
    if (timeRemaining === 0 && timerActive) {
      stopTimer();
      if (isListening) {
        stopListening();
      }
      toast({ title: "⏰ Time's up!", description: "Your recording has been stopped automatically." });
    }
  }, [timeRemaining, timerActive, stopTimer, isListening, stopListening, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
      stopTimer();
    } else {
      clearTranscription();
      startListening();
      if (selectedDrill) {
        startTimer(selectedDrill.timeLimit);
      }
    }
  };

  const handleSelectDrill = (drill: DrillType) => {
    setSelectedDrill(drill);
    setTopic(drill.prompt || SAMPLE_TOPICS[Math.floor(Math.random() * SAMPLE_TOPICS.length)]);
    setUserResponse("");
    setFeedback(null);
    setTimeRemaining(null);
    setTimerActive(false);
    stopTimer();
  };

  const handleSubmitResponse = async () => {
    if (!userResponse.trim() || !selectedDrill) {
      toast({ title: "Response required", description: "Please provide your response", variant: "destructive" });
      return;
    }

    stopTimer();
    if (isListening) stopListening();
    setIsProcessing(true);
    try {
      const drillTypeForApi = getApiDrillType(selectedDrill.id);
      const { data: feedbackData, error: feedbackError } = await invokeWithAuth('drill-feedback', {
        body: {
          drill_type: drillTypeForApi,
          topic,
          user_response: userResponse,
          time_limit_seconds: selectedDrill.timeLimit,
          ...(selectedDrill.scenario ? { scenario: selectedDrill.scenario } : {}),
        }
      });

      if (feedbackError) throw feedbackError;
      setFeedback(feedbackData);

      const { error: saveError } = await supabase
        .from('skill_drills')
        .insert({
          user_id: user?.id || null,
          drill_type: drillTypeForApi as any,
          topic,
          user_response: userResponse,
          ai_feedback: JSON.stringify(feedbackData),
          score: feedbackData.score,
          completed_at: new Date().toISOString(),
          time_limit_seconds: selectedDrill.timeLimit
        });

      if (saveError) throw saveError;

      // Update skill progress
      if (user?.id && feedbackData.score) {
        const drillApiType = drillTypeForApi;
        const skillMap: Record<string, string[]> = {
          opening_statement: ['clarity', 'argument_strength'],
          star_response: ['argument_strength', 'confidence'],
          rebuttal: ['rebuttal', 'listening'],
          time_boxed: ['clarity', 'confidence'],
        };
        const skills = skillMap[drillApiType] || ['clarity'];
        const minutes = Math.round(selectedDrill.timeLimit / 60);
        await updateSkillProgress(
          user.id,
          skills.map(s => ({ skill_name: s, score: feedbackData.score, minutes }))
        );
      }

      toast({ title: "Drill completed!", description: `Score: ${feedbackData.score}%` });
    } catch (error: any) {
      console.error('Error processing drill:', error);
      toast({ title: "Error processing drill", description: error.message || "Please try again", variant: "destructive" });
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
    setTimerActive(false);
    stopTimer();
  };

  const handleDrillCreated = (drill: DrillType) => {
    setCustomDrills(prev => [...prev, drill]);
  };

  const handleDeleteDrill = async () => {
    if (!drillToDelete) return;
    const { error } = await supabase
      .from('custom_drills')
      .delete()
      .eq('id', drillToDelete.id);
    if (error) {
      toast({ title: "Error deleting drill", description: error.message, variant: "destructive" });
    } else {
      setCustomDrills(prev => prev.filter(d => d.id !== drillToDelete.id));
      toast({ title: "Drill deleted", description: `"${drillToDelete.name}" has been removed.` });
    }
    setDrillToDelete(null);
  };

  const timerProgress = selectedDrill && timeRemaining !== null
    ? (timeRemaining / selectedDrill.timeLimit) * 100
    : 100;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="container mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <div className="gap-2 sm:gap-4 flex items-center justify-center">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center">SKILL DRILLS</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-mono">Focused exercises for specific skills</p>
          </div>
        </div>

        {!selectedDrill ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {allDrills.map((drill, index) => {
                const Icon = drill.icon;
                return (
                  <Card
                    key={`${drill.id}-${index}`}
                    className="p-4 sm:p-5 lg:p-6 border-2 sm:border-3 lg:border-4 border-border hover:shadow-md transition-shadow cursor-pointer flex flex-col relative group"
                    onClick={() => handleSelectDrill(drill)}
                  >
                    {drill.type === 'custom' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrillToDelete(drill);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <div className="flex flex-col flex-1 space-y-3 sm:space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg lg:text-xl font-bold leading-tight break-words">{drill.name}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Badge variant="outline" className="border text-[10px] sm:text-xs whitespace-nowrap">
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                              {drill.timeLimit}s
                            </Badge>
                            {drill.type === 'custom' && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs">Custom</Badge>
                            )}
                            {drill.type === 'scenario' && (
                              <Badge variant="default" className="text-[10px] sm:text-xs">Scenario</Badge>
                            )}
                            {drill.difficulty && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs capitalize">{drill.difficulty}</Badge>
                            )}
                          </div>
                        </div>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 flex-shrink-0 mt-0.5" />
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">{drill.description}</p>
                      <Button className="w-full border-2 sm:border-3 lg:border-4 border-border shadow-sm text-xs sm:text-sm h-9 sm:h-10">
                        START DRILL
                      </Button>
                    </div>
                  </Card>
                );
              })}

              {/* Create Custom Drill Card */}
              <Card
                className="p-4 sm:p-5 lg:p-6 border-2 sm:border-3 lg:border-4 border-dashed border-muted-foreground/40 hover:border-primary/60 hover:shadow-md transition-all cursor-pointer flex flex-col"
                onClick={() => setShowCreateModal(true)}
              >
                <div className="flex flex-col flex-1 items-center justify-center space-y-3 sm:space-y-4 text-center py-2">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                    <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold leading-tight">Create Custom Drill</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2">
                      Design your own speaking drill with a custom topic and time limit.
                    </p>
                  </div>
                  <Button variant="outline" className="w-full border-2 text-xs sm:text-sm h-9 sm:h-10">
                    CREATE DRILL
                  </Button>
                </div>
              </Card>
            </div>

            <DrillHistory />
          </>
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
                {/* Countdown Timer */}
                {timeRemaining !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TimerIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-muted-foreground">TIME REMAINING</span>
                      </div>
                      <span className={`text-2xl font-mono font-bold ${timeRemaining === 0 ? 'text-destructive' : timeRemaining <= 10 ? 'text-destructive animate-pulse' : ''}`}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                    <Progress value={timerProgress} className="h-2 border border-border" />
                    {timeRemaining === 0 && (
                      <p className="text-sm font-bold text-destructive text-center">⏰ Time&apos;s up!</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold">YOUR RESPONSE</label>
                    {isCorrecting && <span className="text-xs text-muted-foreground animate-pulse">Correcting...</span>}
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
                        disabled={isProcessing || timeRemaining === 0}
                      >
                        {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {timerActive ? 'Recording in progress...' : timeRemaining === 0 ? 'Time expired — submit your response' : `Aim for ${selectedDrill.timeLimit} seconds worth of content`}
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleReset} className="border-2">CANCEL</Button>
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={isProcessing || !userResponse.trim()}
                    className="flex-1 border-4 border-border shadow-md"
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />GETTING FEEDBACK...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />SUBMIT FOR FEEDBACK</>
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
                  <Button variant="outline" onClick={handleReset} className="border-2">TRY DIFFERENT DRILL</Button>
                  <Button
                    onClick={() => {
                      setFeedback(null);
                      setUserResponse("");
                      setTimeRemaining(null);
                      setTimerActive(false);
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

      <CreateDrillModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onDrillCreated={handleDrillCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!drillToDelete} onOpenChange={(open) => !open && setDrillToDelete(null)}>
        <AlertDialogContent className="border-4 border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this custom drill?</AlertDialogTitle>
            <AlertDialogDescription>
              "{drillToDelete?.name}" will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDrill} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SkillDrills;
