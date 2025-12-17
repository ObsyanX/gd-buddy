import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Mic, Square, User, Bot, Info, Volume2, VolumeX, Play, RefreshCw, Check, X, HelpCircle, Loader2, Sparkles, SkipForward } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/supabase-auth";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePracticeMode } from "@/hooks/usePracticeMode";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useStreamingTranscription } from "@/hooks/useStreamingTranscription";
import { AudioWaveform } from "@/components/AudioWaveform";
import { VoiceActivityIndicator } from "@/components/VoiceActivityIndicator";
import { PracticeHistory } from "@/components/PracticeHistory";
import { WPMDisplay, useWordCountEstimator } from "@/components/WPMDisplay";
import { OnboardingTutorial, useOnboardingTutorial } from "@/components/OnboardingTutorial";
import VideoMonitor, { VideoMetrics } from "@/components/VideoMonitor";
import ParticipantPresence from "@/components/ParticipantPresence";
import { useMultiplayerPresence } from "@/hooks/useMultiplayerPresence";
import { AppSettings } from "@/pages/Settings";

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
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const [autoMicEnabled, setAutoMicEnabled] = useState(false);
  const [autoMicSetting, setAutoMicSetting] = useState(true);
  const [videoMetricsRef, setVideoMetricsRef] = useState<VideoMetrics | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingSendRef = useRef(false);
  const { toast } = useToast();
  
  // Load auto-mic setting from localStorage and initialize autoMicEnabled
  useEffect(() => {
    const savedAppSettings = localStorage.getItem('appSettings');
    if (savedAppSettings) {
      const parsed = JSON.parse(savedAppSettings) as AppSettings;
      const setting = parsed.autoMicEnabled ?? true;
      setAutoMicSetting(setting);
      setAutoMicEnabled(setting); // Initialize from user preference
    }
  }, []);
  
  // Streaming transcription for real-time voice input (like Google Keyboard)
  const { 
    isListening, 
    isSupported: isSpeechSupported, 
    isCorrecting,
    displayText: streamingText,
    startListening, 
    stopListening,
    clearTranscription
  } = useStreamingTranscription({
    context: session?.topic,
    onInterimResult: (text) => setUserInput(text),
    onFinalResult: (text) => {
      setUserInput(text);
      // If pending send, trigger it after correction completes
      if (pendingSendRef.current && text.trim()) {
        pendingSendRef.current = false;
        // Small delay to ensure state is updated
        setTimeout(() => handleSendMessageDirect(text), 100);
      }
    },
    onCorrectionStart: () => {
      // Visual feedback handled by isCorrecting state
    },
    onCorrectionEnd: () => {
      // Correction complete
    },
  });
  
  const { isSpeaking, currentSpeaker, speak, stop: stopSpeaking } = useTextToSpeech();
  const { showTutorial, setShowTutorial, resetTutorial } = useOnboardingTutorial();
  const { estimatedWordCount, updateFromAudioLevel, reset: resetWordCount } = useWordCountEstimator();
  
  // Multiplayer presence
  const { presenceState, typingParticipants, setTyping } = useMultiplayerPresence({
    sessionId,
    enabled: session?.is_multiplayer ?? false,
  });
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

  // Track which messages we've already processed for TTS to avoid duplicates
  const processedMessagesRef = useRef<Set<string>>(new Set());
  
  // Get current user ID for multiplayer identification
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);
  
  // Realtime subscription for multiplayer participants sync (update when new participants join)
  useEffect(() => {
    if (!session?.is_multiplayer) return;

    console.log('[Multiplayer] Setting up realtime subscription for participants:', sessionId);

    const participantsChannel = supabase
      .channel(`gd_participants_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gd_participants',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          console.log('[Multiplayer] New participant joined:', payload.new);
          // Add the new participant to the list
          setParticipants(prev => {
            if (prev.find(p => p.id === payload.new.id)) return prev;
            return [...prev, payload.new].sort((a, b) => a.order_index - b.order_index);
          });
        }
      )
      .subscribe((status) => {
        console.log('[Multiplayer] Participants subscription status:', status);
      });

    return () => {
      console.log('[Multiplayer] Cleaning up participants subscription');
      supabase.removeChannel(participantsChannel);
    };
  }, [sessionId, session?.is_multiplayer]);

  // Realtime subscription for multiplayer message sync
  useEffect(() => {
    if (!session?.is_multiplayer) return;

    console.log('[Multiplayer] Setting up realtime subscription for session:', sessionId);

    const channel = supabase
      .channel(`gd_messages_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gd_messages',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          console.log('[Multiplayer] Received new message via realtime:', payload.new);
          
          // Skip if we've already processed this message
          if (processedMessagesRef.current.has(payload.new.id)) {
            console.log('[Multiplayer] Message already processed, skipping:', payload.new.id);
            return;
          }

          // Fetch the complete message with participant info
          const { data: newMessage, error: fetchError } = await supabase
            .from('gd_messages')
            .select('*, gd_participants(*)')
            .eq('id', payload.new.id)
            .single();

          if (fetchError) {
            console.error('[Multiplayer] Error fetching message details:', fetchError);
            return;
          }

          if (newMessage) {
            console.log('[Multiplayer] Fetched message with participant:', newMessage);
            
            // Check if this message was sent by the current authenticated user
            // Use real_user_id to properly identify messages in multiplayer (multiple humans)
            const messageParticipant = newMessage.gd_participants;
            const isOwnMessage = messageParticipant?.real_user_id === currentUserId;
            
            console.log('[Multiplayer] Current user:', currentUserId, 'Message from real_user_id:', messageParticipant?.real_user_id, 'Is own:', isOwnMessage);
            
            // Mark as processed
            processedMessagesRef.current.add(newMessage.id);
            
            setMessages(prev => {
              // Avoid duplicates in state
              if (prev.find(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });

            // Play TTS for messages from other participants (not our own messages)
            // This includes messages from other human players AND AI participants triggered by them
            if (!isOwnMessage && autoPlayTTS && messageParticipant) {
              console.log('[Multiplayer TTS] Playing message from:', messageParticipant.persona_name, 'Voice:', messageParticipant.voice_name);
              try {
                await speak(newMessage.text, messageParticipant.persona_name, messageParticipant.voice_name);
                console.log('[Multiplayer TTS] Finished speaking message from:', messageParticipant.persona_name);
              } catch (e) {
                console.error('[Multiplayer TTS] Error:', e);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Multiplayer] Subscription status:', status);
      });

    return () => {
      console.log('[Multiplayer] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [sessionId, session?.is_multiplayer, currentUserId, autoPlayTTS, speak]);

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

  // Direct send with specific text (used for auto-send after voice)
  const handleSendMessageDirect = async (textToSend: string) => {
    if (!textToSend.trim() || isProcessing) return;

    setIsProcessing(true);
    // Find the participant that matches the current authenticated user
    // In multiplayer, multiple participants have is_user=true, so match by real_user_id
    const userParticipant = participants.find(p => p.is_user && p.real_user_id === currentUserId) 
      || participants.find(p => p.is_user); // Fallback for solo mode
    const messageText = textToSend.trim();

    try {
      // Save user message
      const { data: userMessage, error: messageError } = await supabase
        .from('gd_messages')
        .insert({
          session_id: sessionId,
          participant_id: userParticipant.id,
          text: messageText,
          intent: null,
          interruption: false
        })
        .select('*, gd_participants(*)')
        .single();

      if (messageError) throw messageError;

      setMessages(prev => [...prev, userMessage]);
      setUserInput("");
      clearTranscription();
      
      // Mark first message sent
      if (!hasSentFirstMessage) {
        setHasSentFirstMessage(true);
      }

      // Wait for human participant's speech to finish before AI responds
      // Calculate delay based on message length: ~80ms per character (approx TTS speaking rate)
      // Minimum 2s, maximum 15s to avoid excessive waits
      const baseDelay = session?.is_multiplayer ? 2000 : 1000;
      const charDelay = messageText.length * 80; // ~80ms per character for TTS playback
      const humanSpeechDelay = Math.min(Math.max(baseDelay + charDelay, 2000), 15000);
      console.log(`[AI Response Delay] Message length: ${messageText.length} chars, waiting ${humanSpeechDelay}ms for speech to complete...`);
      await new Promise(resolve => setTimeout(resolve, humanSpeechDelay));
      console.log('[AI Response Delay] Proceeding with AI response generation');

      // Get AI responses
      const conversationHistory = messages.map(m => ({
        who: m.gd_participants?.persona_name || 'Unknown',
        text: m.text,
        start_ts: m.start_ts,
        end_ts: m.end_ts
      }));

      const { data: aiResponse, error: aiError } = await invokeWithAuth('gd-conductor', {
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
          latest_user_utterance: messageText,
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

      // Auto-reopen mic after AI responses complete (if enabled and setting allows)
      if (autoMicEnabled && autoMicSetting && isSpeechSupported) {
        setTimeout(() => {
          startListening();
        }, 500);
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

  const handleSendMessage = async () => {
    await handleSendMessageDirect(userInput);
  };

  // Handle send button click - stop listening and send
  const handleSendWithVoice = () => {
    if (isListening) {
      // Stop listening and mark for auto-send after correction
      pendingSendRef.current = true;
      stopListening();
    } else if (userInput.trim()) {
      handleSendMessage();
    }
  };

  const handleEndSession = async () => {
    try {
      // Stop all ongoing audio/speech activities
      stopSpeaking();
      stopListening();
      cancelPractice();
      
      // Get video metrics if available
      const getVideoMetrics = (window as any).__getVideoSessionMetrics;
      let videoSessionMetrics = null;
      if (getVideoMetrics) {
        videoSessionMetrics = getVideoMetrics();
      }

      // Save video metrics to database
      if (videoSessionMetrics && (videoSessionMetrics.avgPostureScore || videoSessionMetrics.avgEyeContactScore)) {
        await supabase
          .from('gd_metrics')
          .upsert({
            session_id: sessionId,
            posture_score: videoSessionMetrics.avgPostureScore,
            eye_contact_score: videoSessionMetrics.avgEyeContactScore,
            expression_score: videoSessionMetrics.avgExpressionScore,
            video_tips: videoSessionMetrics.tips,
            updated_at: new Date().toISOString()
          });
      }

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

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handlePracticeAccept = async () => {
    const audioUrl = practiceAudioUrl;
    if (!audioUrl) return;

    // Calculate WPM based on estimated word count and duration
    const wpm = currentRecordingDuration > 0 
      ? Math.round((estimatedWordCount / currentRecordingDuration) * 60)
      : null;

    // Accept practice with WPM - transcription already in input from streaming
    acceptPractice(userInput || null, wpm);
  };

  const handleVideoMetricsUpdate = (metrics: VideoMetrics) => {
    setVideoMetricsRef(metrics);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onMicToggle: () => {
      if (!isPracticing && !isProcessing) {
        if (isListening) {
          handleVoiceInput();
        } else {
          startPracticeRecording();
        }
      }
    },
    onSendMessage: () => {
      if (!isProcessing && userInput.trim() && !isListening && !isPracticing) {
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
              {isListening && (
                <Badge variant="outline" className="border-2 animate-pulse bg-destructive/20">🎤 Listening...</Badge>
              )}
              {isCorrecting && (
                <Badge variant="outline" className="border-2 animate-pulse bg-primary/20">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Correcting...
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoMicEnabled(!autoMicEnabled)}
                className={`border-2 text-xs ${autoMicEnabled && autoMicSetting ? 'bg-accent/20' : ''}`}
                disabled={!autoMicSetting}
                title={autoMicSetting ? "Toggle auto-mic after first message" : "Enable auto-mic in Settings"}
              >
                <Mic className="w-3 h-3 mr-1" />
                Auto-mic {autoMicEnabled && autoMicSetting ? 'ON' : 'OFF'}
              </Button>
              {session.is_multiplayer && (
                <>
                  <Badge variant="default" className="border-2">Multiplayer</Badge>
                  {session.room_code && (
                    <Badge variant="outline" className="border-2 font-mono">
                      🔑 Room: {session.room_code}
                    </Badge>
                  )}
                </>
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
                  // Determine if this message is from the current authenticated user
                  const messageParticipant = message.gd_participants;
                  
                  // Debug logging for message attribution
                  if (index === messages.length - 1) {
                    console.log('[Message Attribution]', {
                      messageId: message.id,
                      participantName: messageParticipant?.persona_name,
                      participantRealUserId: messageParticipant?.real_user_id,
                      currentUserId,
                      isUser: messageParticipant?.is_user,
                    });
                  }
                  
                  // Check message ownership: compare real_user_id with current user
                  // This works for both solo and multiplayer modes
                  const isFromCurrentUser = messageParticipant?.is_user && 
                    messageParticipant?.real_user_id && 
                    currentUserId && 
                    messageParticipant.real_user_id === currentUserId;
                  
                  const isCurrentlySpeaking = isSpeaking && currentSpeaker === messageParticipant?.persona_name;
                  const isAI = !messageParticipant?.is_user;
                  // Other human = is_user true but NOT from current authenticated user
                  const isOtherHuman = messageParticipant?.is_user && !isFromCurrentUser;
                  
                  return (
                    <div 
                      key={index}
                      className={`flex gap-3 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isFromCurrentUser && (
                        <div className={`w-8 h-8 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 ${isCurrentlySpeaking ? 'border-primary bg-primary/20 animate-pulse' : 'border-border'}`}>
                          {isCurrentlySpeaking ? (
                            <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                          ) : isAI ? (
                            <Bot className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                      )}
                      <div className={`max-w-[80%] space-y-1 ${isFromCurrentUser ? 'text-right' : ''}`}>
                        <p className={`text-xs font-bold ${isCurrentlySpeaking ? 'text-primary' : 'text-muted-foreground'}`}>
                          {isFromCurrentUser ? 'You' : messageParticipant?.persona_name}
                          {isOtherHuman && <span className="ml-1 text-muted-foreground">(Player)</span>}
                          {isCurrentlySpeaking && <span className="ml-2 animate-pulse">🔊 Speaking...</span>}
                        </p>
                        <div className={`p-4 border-2 ${isFromCurrentUser ? 'bg-primary text-primary-foreground border-primary' : isCurrentlySpeaking ? 'bg-primary/10 border-primary' : 'bg-card border-border'}`}>
                          <p className="text-sm">{message.text}</p>
                        </div>
                        {message.intent && (
                          <Badge variant="outline" className="text-xs">
                            {message.intent}
                          </Badge>
                        )}
                      </div>
                      {isFromCurrentUser && (
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
            {/* AI Correction Indicator */}
            {isCorrecting && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono">Applying AI correction...</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                placeholder={isListening ? "Speaking..." : "Type your response or use voice input..."}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !isListening) {
                    handleSendMessage();
                  }
                }}
                className={`border-2 text-lg ${isListening ? 'border-destructive bg-destructive/5' : ''}`}
                disabled={isProcessing || isPracticing}
                readOnly={isListening}
              />
              <Button
                onClick={startPracticeRecording}
                disabled={isProcessing || isListening || isPracticing}
                variant="outline"
                className="border-4 border-border"
                size="lg"
                title="Practice Mode (Ctrl+M)"
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleVoiceInput}
                disabled={isProcessing || isPracticing || isCorrecting}
                variant={isListening ? "destructive" : "outline"}
                className={`border-4 border-border ${isListening ? 'animate-pulse' : ''}`}
                size="lg"
                title="Voice Input - Real-time (Click to toggle)"
              >
                {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button 
                onClick={handleSendWithVoice}
                disabled={isProcessing || (!userInput.trim() && !isListening) || isPracticing || isCorrecting}
                className="border-4 border-border"
                size="lg"
                title={isListening ? "Stop & Send" : "Send (Ctrl+Enter)"}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
              <Button 
                onClick={() => handleSendMessageDirect("[Skipped turn]")}
                disabled={isProcessing || isPracticing}
                variant="outline"
                className="border-2"
                size="lg"
                title="Skip your turn"
              >
                <SkipForward className="w-4 h-4" />
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
            <ParticipantPresence
              participants={participants}
              presenceState={presenceState}
              typingParticipants={typingParticipants}
              isMultiplayer={session?.is_multiplayer ?? false}
            />
          </Card>

          {/* Video Monitor */}
          <VideoMonitor 
            isActive={true}
            onMetricsUpdate={handleVideoMetricsUpdate}
          />

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
                className="border-4 border-border"
              >
                <Check className="w-4 h-4 mr-2" />
                ACCEPT
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscussionRoom;
