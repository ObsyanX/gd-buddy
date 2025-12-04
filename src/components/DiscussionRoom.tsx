import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Mic, Square, User, Bot, Info, Volume2, VolumeX, Play, RefreshCw, Check, X, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePracticeMode } from "@/hooks/usePracticeMode";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useBrowserWhisper } from "@/hooks/useBrowserWhisper";
import { AudioWaveform } from "@/components/AudioWaveform";
import { VoiceActivityIndicator } from "@/components/VoiceActivityIndicator";
import { PracticeHistory } from "@/components/PracticeHistory";
import { WPMDisplay, useWordCountEstimator } from "@/components/WPMDisplay";
import { OnboardingTutorial, useOnboardingTutorial } from "@/components/OnboardingTutorial";

interface DiscussionRoomProps {
  sessionId: string;
  onComplete: () => void;
}

const DiscussionRoom = ({ sessionId, onComplete }: DiscussionRoomProps) => {
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [autoPlayTTS, setAutoPlayTTS] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isRecording, isProcessing: isTranscribing, isModelLoading, startRecording, stopRecording } = useAudioRecorder();
  const { isSpeaking, currentSpeaker, speak, stop: stopSpeaking } = useTextToSpeech();
  const { transcribeFromUrl, isTranscribing: isPracticeTranscribing } = useBrowserWhisper();
  const { showTutorial, setShowTutorial, resetTutorial } = useOnboardingTutorial();
  const { estimatedWordCount, updateFromAudioLevel, reset: resetWordCount } = useWordCountEstimator();
  const {
    isPracticing,
    isRecordingPractice,
    practiceAudioUrl,
    isPlayingPractice,
    practiceStream,
    practiceHistory,
    currentPlayingId,
    recordingStartTime,
    currentRecordingDuration,
    startPracticeRecording,
    stopPracticeRecording,
    playPracticeRecording,
    playHistoryRecording,
    stopPracticePlayback,
    cancelPractice,
    acceptPractice,
    deleteHistoryRecording,
  } = usePracticeMode();

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Audio level monitoring for WPM estimation
  useEffect(() => {
    if (!isRecordingPractice || !practiceStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(practiceStream);
    source.connect(analyser);
    
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!isRecordingPractice) return;
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      updateFromAudioLevel(normalizedLevel);
      
      requestAnimationFrame(checkLevel);
    };
    
    checkLevel();
    resetWordCount();

    return () => {
      audioContext.close();
    };
  }, [isRecordingPractice, practiceStream]);

  const loadSession = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('gd_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const { data: participantsData, error: participantsError } = await supabase
        .from('gd_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index');

      if (participantsError) throw participantsError;

      const { data: messagesData, error: messagesError } = await supabase
        .from('gd_messages')
        .select('*, gd_participants(*)')
        .eq('session_id', sessionId)
        .order('start_ts');

      if (messagesError) throw messagesError;

      setSession(sessionData);
      setParticipants(participantsData);
      setMessages(messagesData || []);

      // Update session status to active
      if (sessionData.status === 'setup') {
        await supabase
          .from('gd_sessions')
          .update({ status: 'active', start_time: new Date().toISOString() })
          .eq('id', sessionId);
      }
    } catch (error: any) {
      console.error('Error loading session:', error);
      toast({
        title: "Error loading session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    setIsProcessing(true);
    const userParticipant = participants.find(p => p.is_user);

    try {
      // Save user message
      const { data: userMessage, error: messageError } = await supabase
        .from('gd_messages')
        .insert({
          session_id: sessionId,
          participant_id: userParticipant.id,
          text: userInput,
          intent: null,
          interruption: false
        })
        .select('*, gd_participants(*)')
        .single();

      if (messageError) throw messageError;

      setMessages(prev => [...prev, userMessage]);
      setUserInput("");

      // Get AI responses
      const conversationHistory = messages.map(m => ({
        who: m.gd_participants?.persona_name || 'Unknown',
        text: m.text,
        start_ts: m.start_ts,
        end_ts: m.end_ts
      }));

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('gd-conductor', {
        body: {
          session_id: sessionId,
          topic: session.topic,
          topic_meta: {
            category: session.topic_category,
            difficulty: session.topic_difficulty,
            tags: session.topic_tags
          },
          participants: participants.map(p => ({
            id: p.id,
            is_user: p.is_user,
            persona: {
              name: p.persona_name,
              role: p.persona_role,
              tone: p.persona_tone,
              verbosity: p.persona_verbosity,
              interrupt_level: p.persona_interrupt_level,
              agreeability: p.persona_agreeability,
              vocab_level: p.persona_vocab_level
            },
            voice: {
              voice_name: p.voice_name,
              rate_pct: p.voice_rate_pct,
              pitch_pct: p.voice_pitch_pct,
              style: p.voice_style
            },
            order_index: p.order_index
          })),
          conversation_history: conversationHistory,
          latest_user_utterance: userInput,
          config: {
            max_reply_words: 40,
            interruption_mode: 'light',
            invigilator_mode: 'coaching'
          },
          request: 'generate_responses'
        }
      });

      if (aiError) {
        console.error('AI Error:', aiError);
        throw aiError;
      }

      console.log('AI Response:', aiResponse);

      // Process AI responses one by one (sequential text + TTS)
      if (aiResponse?.participant_responses) {
        for (const response of aiResponse.participant_responses) {
          const { data: aiMsg, error: aiMsgError } = await supabase
            .from('gd_messages')
            .insert({
              session_id: sessionId,
              participant_id: response.participant_id,
              text: response.text,
              intent: response.intent,
              interruption: response.interruption,
              overlap_seconds: response.overlap_seconds,
              tts_ssml: response.tts_ssml,
              confidence_estimate: response.confidence_estimate
            })
            .select('*, gd_participants(*)')
            .single();

          if (!aiMsgError && aiMsg) {
            // Add message to UI first
            setMessages(prev => [...prev, aiMsg]);
            
            // Play TTS and wait for it to finish before next participant
            if (autoPlayTTS) {
              const participant = participants.find(p => p.id === response.participant_id);
              try {
                await speak(response.text, participant?.persona_name, participant?.voice_name);
              } catch (e) {
                // Continue even if TTS fails
                console.error('TTS error:', e);
              }
            }
          }
        }
      }

      // Update feedback
      if (aiResponse?.invigilator_signals) {
        setFeedback(aiResponse.invigilator_signals);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error processing message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndSession = async () => {
    try {
      await supabase
        .from('gd_sessions')
        .update({ status: 'completed', end_time: new Date().toISOString() })
        .eq('id', sessionId);

      onComplete();
    } catch (error: any) {
      console.error('Error ending session:', error);
      toast({
        title: "Error ending session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      const transcription = await stopRecording();
      if (transcription) {
        setUserInput(transcription);
      }
    } else {
      startRecording();
    }
  };

  const handlePracticeAccept = async () => {
    const audioUrl = practiceAudioUrl;
    if (!audioUrl) return;

    // Calculate WPM based on estimated word count and duration
    const wpm = currentRecordingDuration > 0 
      ? Math.round((estimatedWordCount / currentRecordingDuration) * 60)
      : null;

    try {
      // Use browser-based Whisper for transcription
      const transcription = await transcribeFromUrl(audioUrl);
      
      // Accept practice and save to history with transcription and WPM
      acceptPractice(transcription, wpm);
      
      if (transcription) {
        setUserInput(transcription);
      }
    } catch (error: any) {
      console.error('Error transcribing practice audio:', error);
      toast({
        title: "Transcription failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      // Still accept the practice even if transcription fails
      acceptPractice(null, wpm);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onMicToggle: () => {
      if (!isPracticing && !isProcessing) {
        if (isRecording) {
          handleVoiceInput();
        } else {
          startPracticeRecording();
        }
      }
    },
    onSendMessage: () => {
      if (!isProcessing && userInput.trim() && !isRecording && !isTranscribing && !isPracticing) {
        handleSendMessage();
      }
    },
    onStopTTS: () => {
      if (isSpeaking) {
        stopSpeaking();
      } else if (isPlayingPractice) {
        stopPracticePlayback();
      }
    },
  });

  if (!session) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-xl font-mono">LOADING SESSION...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Onboarding Tutorial */}
      {showTutorial && (
        <OnboardingTutorial onComplete={() => setShowTutorial(false)} />
      )}

      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{session.topic}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary">{session.topic_category}</Badge>
              <Badge variant="outline" className="border-2">{messages.length} turns</Badge>
              {isModelLoading && (
                <Badge variant="outline" className="border-2 animate-pulse">Loading AI...</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetTutorial}
              title="Show Tutorial"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setAutoPlayTTS(!autoPlayTTS)}
              className="border-2"
            >
              {autoPlayTTS ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
              TTS {autoPlayTTS ? 'ON' : 'OFF'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleEndSession}
              className="border-4 border-border"
            >
              <Square className="w-4 h-4 mr-2" />
              END SESSION
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto grid md:grid-cols-4 gap-4 p-4">
        <div className="md:col-span-3 space-y-4">
          <Card className="border-4 border-border h-[calc(100vh-350px)] flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isUser = message.gd_participants?.is_user;
                  return (
                    <div 
                      key={index}
                      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded border-2 border-border flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div className={`max-w-[80%] space-y-1 ${isUser ? 'text-right' : ''}`}>
                        <p className="text-xs font-bold text-muted-foreground">
                          {message.gd_participants?.persona_name}
                        </p>
                        <div className={`p-4 border-2 ${isUser ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>
                          <p className="text-sm">{message.text}</p>
                        </div>
                        {message.intent && (
                          <Badge variant="outline" className="text-xs">
                            {message.intent}
                          </Badge>
                        )}
                      </div>
                      {isUser && (
                        <div className="w-8 h-8 rounded border-2 border-border flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </Card>

          {/* Voice Activity Indicator */}
          <VoiceActivityIndicator isActive={isSpeaking} participantName={currentSpeaker || undefined} />

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Type your response or use voice input..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                    handleSendMessage();
                  }
                }}
                className="border-2 text-lg"
                disabled={isProcessing || isRecording || isTranscribing || isPracticing}
              />
              <Button
                onClick={startPracticeRecording}
                disabled={isProcessing || isTranscribing || isRecording || isPracticing}
                variant="outline"
                className="border-4 border-border"
                size="lg"
                title="Practice Mode (Ctrl+M)"
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleVoiceInput}
                disabled={isProcessing || isTranscribing || isPracticing}
                variant={isRecording ? "destructive" : "outline"}
                className="border-4 border-border"
                size="lg"
                title="Quick Record"
              >
                {isTranscribing ? "..." : <Mic className="w-4 h-4" />}
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={isProcessing || !userInput.trim() || isRecording || isTranscribing || isPracticing}
                className="border-4 border-border"
                size="lg"
                title="Send (Ctrl+Enter)"
              >
                {isProcessing ? "..." : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-mono text-center">
              TIP: Ctrl+M for practice • Ctrl+Enter to send • Esc to stop audio
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4 border-4 border-border">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              LIVE FEEDBACK
            </h3>
            {feedback ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Fluency</p>
                  <p className="font-bold text-lg">{feedback.fluency_score || 0}/100</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WPM</p>
                  <p className="font-bold">{Math.round(feedback.wpm || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fillers</p>
                  <p className="font-bold">{feedback.filler_count || 0}</p>
                </div>
                {feedback.live_hint && (
                  <div className="pt-2 border-t-2 border-border">
                    <p className="text-xs font-mono">{feedback.live_hint}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-mono">
                Feedback will appear as you participate
              </p>
            )}
          </Card>

          <Card className="p-4 border-4 border-border">
            <h3 className="font-bold text-sm mb-3">PARTICIPANTS</h3>
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  {p.is_user ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  <span className="font-bold">{p.persona_name}</span>
                  {!p.is_user && (
                    <Badge variant="outline" className="text-xs">{p.persona_tone}</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Practice History */}
          <PracticeHistory 
            recordings={practiceHistory}
            onPlay={playHistoryRecording}
            onDelete={deleteHistoryRecording}
            currentlyPlaying={currentPlayingId}
          />
        </div>
      </div>

      {/* Practice Mode Dialog */}
      <Dialog open={isPracticing} onOpenChange={(open) => !open && cancelPractice()}>
        <DialogContent className="border-4 border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">PRACTICE MODE</DialogTitle>
            <DialogDescription className="font-mono">
              Record your response and review it before sending
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <AudioWaveform isRecording={isRecordingPractice} stream={practiceStream} />
            
            {/* Real-time WPM Display */}
            <WPMDisplay 
              isRecording={isRecordingPractice}
              recordingStartTime={recordingStartTime}
              estimatedWordCount={estimatedWordCount}
            />

            {practiceAudioUrl && (
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={playPracticeRecording}
                  disabled={isPlayingPractice}
                  variant="outline"
                  className="border-2"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isPlayingPractice ? 'PLAYING...' : 'PLAY'}
                </Button>
                <Button
                  onClick={stopPracticeRecording}
                  disabled={!isRecordingPractice}
                  variant="outline"
                  className="border-2"
                >
                  <Square className="w-4 h-4 mr-2" />
                  STOP
                </Button>
              </div>
            )}

            {!practiceAudioUrl && !isRecordingPractice && (
              <p className="text-center text-muted-foreground font-mono">
                Click RECORD to start practicing
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {!practiceAudioUrl && !isRecordingPractice && (
              <Button
                onClick={startPracticeRecording}
                className="border-4 border-border"
              >
                <Mic className="w-4 h-4 mr-2" />
                RECORD
              </Button>
            )}
            {isRecordingPractice && (
              <Button
                onClick={stopPracticeRecording}
                variant="destructive"
                className="border-4 border-border"
              >
                <Square className="w-4 h-4 mr-2" />
                STOP RECORDING
              </Button>
            )}
            {practiceAudioUrl && !isRecordingPractice && (
              <Button
                onClick={() => {
                  cancelPractice();
                  startPracticeRecording();
                }}
                variant="outline"
                className="border-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                RE-RECORD
              </Button>
            )}
            <Button
              onClick={cancelPractice}
              variant="outline"
              className="border-2"
            >
              <X className="w-4 h-4 mr-2" />
              CANCEL
            </Button>
            {practiceAudioUrl && !isRecordingPractice && (
              <Button
                onClick={handlePracticeAccept}
                disabled={isPracticeTranscribing}
                className="border-4 border-border"
              >
                <Check className="w-4 h-4 mr-2" />
                {isPracticeTranscribing ? 'TRANSCRIBING...' : 'ACCEPT & TRANSCRIBE'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscussionRoom;
