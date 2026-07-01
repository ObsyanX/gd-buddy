import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Mic, Info, Play, RefreshCw, Check, X, Loader2, SkipForward, User, Square, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/supabase-auth";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePracticeMode } from "@/hooks/usePracticeMode";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useStreamingTranscription } from "@/hooks/useStreamingTranscription";
import { AudioWaveform } from "@/components/AudioWaveform";
import { VoiceActivityIndicator } from "@/components/VoiceActivityIndicator";
import { WPMDisplay, useWordCountEstimator } from "@/components/WPMDisplay";
import { OnboardingTutorial, useOnboardingTutorial } from "@/components/OnboardingTutorial";
import { VideoMetrics } from "@/components/VideoMonitor";
import VideoMonitor from "@/components/VideoMonitor";
import ParticipantPresence from "@/components/ParticipantPresence";
import VoiceMetricsPanel, { VoiceSessionMetrics } from "@/components/VoiceMetricsPanel";
import { PracticeHistory } from "@/components/PracticeHistory";
import { useMultiplayerPresence } from "@/hooks/useMultiplayerPresence";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import SessionHeader from "@/components/discussion/SessionHeader";
import MessageList from "@/components/discussion/MessageList";
import MessageInput from "@/components/discussion/MessageInput";
import SessionSidebar, { FeedbackGrid } from "@/components/discussion/SessionSidebar";
import { updatePracticeStreak } from "@/lib/streak-updater";
import { safeCloseAudioContext, safeDisconnectAudioNode, safeStopMediaStream } from "@/lib/audio-utils";

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
  const [liveVoiceMetrics, setLiveVoiceMetrics] = useState<VoiceSessionMetrics | null>(null);
  const [autoPlayTTS, setAutoPlayTTS] = useState(true);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const [autoMicEnabled, setAutoMicEnabled] = useState(false);
  const [autoMicSetting, setAutoMicSetting] = useState(true);
  const [videoMetricsRef, setVideoMetricsRef] = useState<VideoMetrics | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingSendRef = useRef(false);
  const skipWaitRef = useRef<(() => void) | null>(null);
  const [isWaitingForSpeech, setIsWaitingForSpeech] = useState(false);
  const [isMobileMetricsOpen, setIsMobileMetricsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [autoSkipEnabled, setAutoSkipEnabled] = useState(true);
  const { toast } = useToast();
  
  // Load auto-mic setting from Zustand store
  useEffect(() => {
    const setting = useAppSettingsStore.getState().autoMicEnabled;
    setAutoMicSetting(setting);
    setAutoMicEnabled(setting);
  }, []);

  // ---- 15-minute inactivity auto-close + heartbeat + centralized cleanup ----
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInactiveRef = useRef(false);
  const cleanupCallbacksRef = useRef<Array<() => void>>([]);
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const mountedRef = useRef(true);
  const IDLE_MS = 15 * 60 * 1000;
  const HEARTBEAT_MS = 60 * 1000; // ping every 60s while active

  const registerCleanup = (cb: () => void) => {
    cleanupCallbacksRef.current.push(cb);
    return () => {
      cleanupCallbacksRef.current = cleanupCallbacksRef.current.filter((fn) => fn !== cb);
    };
  };

  const scheduleSessionTimeout = (cb: () => void, delayMs: number) => {
    const id = setTimeout(() => {
      pendingTimersRef.current.delete(id);
      if (!isInactiveRef.current && mountedRef.current) cb();
    }, delayMs);
    pendingTimersRef.current.add(id);
    return id;
  };

  const runCentralizedCleanup = () => {
    pendingTimersRef.current.forEach((id) => clearTimeout(id));
    pendingTimersRef.current.clear();
    if (skipWaitRef.current) {
      try { skipWaitRef.current(); } catch {}
      skipWaitRef.current = null;
    }
    // Stop heartbeat
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    // Clear idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    // Run all registered cleanups (audio contexts, media streams, TTS, etc.)
    for (const cb of [...cleanupCallbacksRef.current]) {
      try { cb(); } catch (e) { console.warn('[Cleanup] callback failed', e); }
    }
  };

  const markSessionInactive = async () => {
    if (isInactiveRef.current) return;
    isInactiveRef.current = true;
    setIsPaused(true);
    try {
      await supabase
        .from('gd_sessions')
        .update({ status: 'paused' })
        .eq('id', sessionId);
      toast({
        title: 'Session inactive',
        description: 'Session paused after 15 minutes of inactivity.',
      });
    } catch (e) {
      console.warn('[Idle] Failed to mark session inactive', e);
    }
    // Centralized cleanup: audio, streams, timers, realtime channels
    runCentralizedCleanup();
  };

  const resetIdleTimer = () => {
    if (isInactiveRef.current) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(markSessionInactive, IDLE_MS);
  };

  useEffect(() => {
    resetIdleTimer();
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true } as any));
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Heartbeat: update session.updated_at while active (stops when paused/inactive)
  useEffect(() => {
    if (!sessionId || isPaused || isInactiveRef.current) {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }
    const ping = () => {
      supabase
        .from('gd_sessions')
        .update({ updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) console.warn('[Heartbeat] failed', error.message);
        });
    };
    ping();
    heartbeatTimerRef.current = setInterval(ping, HEARTBEAT_MS);
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [sessionId, isPaused]);

  // Any new message or transcription counts as activity
  useEffect(() => { resetIdleTimer(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, userInput]);

  // Ensure central cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runCentralizedCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        scheduleSessionTimeout(() => handleSendMessageDirect(text), 100);
      }
    },
    onCorrectionStart: () => {
      // Visual feedback handled by isCorrecting state
    },
    onCorrectionEnd: () => {
      // Correction complete
    },
  });
  
  const { isSpeaking, currentSpeaker, usingFallbackTTS, speak, stop: stopSpeaking } = useTextToSpeech();
  const { showTutorial, setShowTutorial, resetTutorial } = useOnboardingTutorial();
  const { estimatedWordCount, updateFromAudioLevel, reset: resetWordCount } = useWordCountEstimator();

  // Register TTS stop with centralized cleanup so idle/unmount stops any playback
  useEffect(() => {
    return registerCleanup(() => { try { stopSpeaking(); } catch {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  // Multiplayer presence
  const { presenceState, typingParticipants, setTyping } = useMultiplayerPresence({
    sessionId,
    enabled: (session?.is_multiplayer ?? false) && !isPaused,
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
    if (!session?.is_multiplayer || isPaused) return;

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
  }, [sessionId, session?.is_multiplayer, isPaused]);

  // Realtime subscription for multiplayer message sync
  useEffect(() => {
    if (!session?.is_multiplayer || isPaused) return;

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
                
                // If this was a human participant's message (is_user=true), add delay before AI responds
                // This ensures the receiving client waits for human speech to finish before AI TTS plays
                if (messageParticipant.is_user) {
                  const speechDelay = Math.min(Math.max(newMessage.text.length * 80, 2000), 10000);
                  console.log(`[Multiplayer TTS] Human participant message - adding ${speechDelay}ms buffer for speech sync`);
                  await new Promise(resolve => setTimeout(resolve, speechDelay));
                }
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
  }, [sessionId, session?.is_multiplayer, currentUserId, autoPlayTTS, speak, isPaused]);

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
    let stopped = false;
    let animationId: number | null = null;
    
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!isRecordingPractice || stopped || audioContext.state === 'closed') return;
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      updateFromAudioLevel(normalizedLevel);
      
      animationId = requestAnimationFrame(checkLevel);
    };
    
    checkLevel();
    resetWordCount();

    const cleanupAudio = () => {
      if (stopped) return;
      stopped = true;
      if (animationId) cancelAnimationFrame(animationId);
      animationId = null;
      safeDisconnectAudioNode(source);
      safeDisconnectAudioNode(analyser);
      safeStopMediaStream(practiceStream);
      void safeCloseAudioContext(audioContext);
    };
    const unregister = registerCleanup(cleanupAudio);

    return () => {
      unregister();
      cleanupAudio();
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
    if (!textToSend.trim() || isProcessing || isPaused) return;

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
      processedMessagesRef.current.add(userMessage.id); // Prevent realtime handler from re-playing TTS
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
      
      setIsWaitingForSpeech(true);
      await new Promise<void>(resolve => {
        const timeoutId = scheduleSessionTimeout(() => {
          skipWaitRef.current = null;
          resolve();
        }, humanSpeechDelay);
        
        // Allow skipping the wait
        skipWaitRef.current = () => {
          clearTimeout(timeoutId);
          skipWaitRef.current = null;
          resolve();
        };
      });
      setIsWaitingForSpeech(false);
      if (isInactiveRef.current || isPaused) return;
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
            max_reply_words: 55,
            interruption_mode: 'light',
            invigilator_mode: 'coaching',
            moderator_mode: localStorage.getItem(`gd-moderator-${sessionId}`) === 'true',
            citation_mode: localStorage.getItem(`gd-citation-${sessionId}`) === 'true',
            originality_mode: 'strict',
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
          // Handle moderator messages (no real participant_id in DB)
          if (response.participant_id === 'moderator') {
            // Show moderator message in UI without DB insert
            const moderatorMsg = {
              id: `moderator-${Date.now()}`,
              session_id: sessionId,
              participant_id: 'moderator',
              text: response.text,
              intent: response.intent,
              start_ts: new Date().toISOString(),
              gd_participants: {
                persona_name: 'Moderator',
                is_user: false,
                voice_name: 'alloy',
              },
            };
            setMessages(prev => [...prev, moderatorMsg]);
            
            if (autoPlayTTS) {
              try {
                await speak(response.text, 'Moderator', 'alloy');
              } catch (e) {
                console.error('TTS error:', e);
              }
            }
            continue;
          }

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
              confidence_estimate: response.confidence_estimate,
              novelty_note: response.novelty_note || null,
              lens: response.lens || null,
              citation: response.citation || null,
            } as any)
            .select('*, gd_participants(*)')
            .single();

          if (!aiMsgError && aiMsg) {
            // Mark as processed BEFORE adding to state to prevent realtime handler duplication
            processedMessagesRef.current.add(aiMsg.id);
            
            // Add message to UI
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
        scheduleSessionTimeout(() => {
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

  const handleTogglePause = async () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);

    if (newPaused) {
      // Pause: stop mic, TTS, update DB status
      stopListening();
      stopSpeaking();
      cancelPractice();
      runCentralizedCleanup();
      await supabase
        .from('gd_sessions')
        .update({ status: 'paused' })
        .eq('id', sessionId);
    } else {
      isInactiveRef.current = false;
      resetIdleTimer();
      // Resume: update DB status back to active
      await supabase
        .from('gd_sessions')
        .update({ status: 'active' })
        .eq('id', sessionId);
    }
  };

  const handleEndSession = async () => {
    try {
      // Stop all ongoing audio/speech activities
      stopSpeaking();
      stopListening();
      cancelPractice();
      runCentralizedCleanup();
      
      // Get video metrics if available
      const getVideoMetrics = (window as any).__getVideoSessionMetrics;
      let videoSessionMetrics = null;
      if (getVideoMetrics) {
        videoSessionMetrics = getVideoMetrics();
        console.log('[EndSession] Video metrics retrieved:', {
          posture: videoSessionMetrics?.avgPostureScore,
          eyeContact: videoSessionMetrics?.avgEyeContactScore,
          expression: videoSessionMetrics?.avgExpressionScore,
          totalFrames: videoSessionMetrics?.faceDetectionRate
        });
      }

      // Save video metrics to database
      // CRITICAL: Check for !== null, not just truthy (0 is valid score, but false in JS)
      const hasPosture = videoSessionMetrics?.avgPostureScore !== null && videoSessionMetrics?.avgPostureScore !== undefined;
      const hasEyeContact = videoSessionMetrics?.avgEyeContactScore !== null && videoSessionMetrics?.avgEyeContactScore !== undefined;
      const hasExpression = videoSessionMetrics?.avgExpressionScore !== null && videoSessionMetrics?.avgExpressionScore !== undefined;
      
      if (videoSessionMetrics && (hasPosture || hasEyeContact || hasExpression)) {
        console.log('[EndSession] Saving video metrics to database...');
        const { error: metricsError } = await supabase
          .from('gd_metrics')
          .upsert({
            session_id: sessionId,
            posture_score: hasPosture ? videoSessionMetrics.avgPostureScore : null,
            eye_contact_score: hasEyeContact ? videoSessionMetrics.avgEyeContactScore : null,
            expression_score: hasExpression ? videoSessionMetrics.avgExpressionScore : null,
            video_tips: videoSessionMetrics.tips,
            updated_at: new Date().toISOString()
          }, { onConflict: 'session_id', ignoreDuplicates: false });
        
        if (metricsError) {
          console.error('[EndSession] Failed to save video metrics:', metricsError);
        } else {
          console.log('[EndSession] Video metrics saved successfully');
        }
      } else {
        console.log('[EndSession] No valid video metrics to save');
      }

      // Save voice metrics from VoiceMetricsPanel to database
      if (liveVoiceMetrics && liveVoiceMetrics.totalWords > 0) {
        // Sanity-cap WPM before saving
        const cappedWpm = Math.min(400, liveVoiceMetrics.estimatedWpm);
        const voiceData = {
          session_id: sessionId,
          total_words: liveVoiceMetrics.totalWords,
          words_per_min: cappedWpm,
          filler_count: liveVoiceMetrics.fillerCount,
          updated_at: new Date().toISOString()
        };

        console.log('[EndSession] Saving voice metrics:', {
          totalWords: voiceData.total_words,
          wpm: voiceData.words_per_min,
          fillers: voiceData.filler_count,
          speakingTime: liveVoiceMetrics.speakingTimeSeconds
        });

        const { error: voiceMetricsError } = await supabase
          .from('gd_metrics')
          .upsert(voiceData, { onConflict: 'session_id', ignoreDuplicates: false });

        if (voiceMetricsError) {
          console.error('[EndSession] Failed to save voice metrics:', voiceMetricsError);
        } else {
          console.log('[EndSession] Voice metrics saved successfully');
        }
      }

      await supabase
        .from('gd_sessions')
        .update({ status: 'completed', end_time: new Date().toISOString() })
        .eq('id', sessionId);

      // Enqueue background jobs for training data aggregation
      try {
        const { enqueueTrainingDataAggregation } = await import('@/lib/job-queue');
        await enqueueTrainingDataAggregation(sessionId);
      } catch (e) {
        console.warn('[EndSession] Failed to enqueue background job:', e);
      }

      // Update practice streak
      if (currentUserId && session?.start_time) {
        const durationMin = Math.max(1, Math.round(
          (Date.now() - new Date(session.start_time).getTime()) / 60000
        ));
        await updatePracticeStreak(currentUserId, durationMin);
      }

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
      {showTutorial && (
        <OnboardingTutorial onComplete={() => setShowTutorial(false)} />
      )}

      <SessionHeader
        session={session}
        messagesCount={messages.length}
        isListening={isListening}
        isCorrecting={isCorrecting}
        autoMicEnabled={autoMicEnabled}
        autoMicSetting={autoMicSetting}
        autoPlayTTS={autoPlayTTS}
        isPaused={isPaused}
        onToggleAutoMic={() => setAutoMicEnabled(!autoMicEnabled)}
        onToggleTTS={() => setAutoPlayTTS(!autoPlayTTS)}
        onTogglePause={handleTogglePause}
        onResetTutorial={resetTutorial}
        onEndSession={handleEndSession}
        usingFallbackTTS={usingFallbackTTS}
      />

      <div className="flex-1 container mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4 overflow-hidden">
        {/* Mobile/Tablet Video Monitor */}
        <div className="lg:hidden">
          <VideoMonitor
            isActive={true}
            sessionId={session?.id}
            isUserMicActive={isListening && !isSpeaking}
            onMetricsUpdate={handleVideoMetricsUpdate}
          />
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            isSpeaking={isSpeaking}
            currentSpeaker={currentSpeaker}
          />

          <VoiceActivityIndicator isActive={isSpeaking} participantName={currentSpeaker || undefined} />

          {isPaused && (
            <div className="flex items-center justify-center gap-3 py-3 px-4 bg-warning/10 rounded-lg border-2 border-warning/30">
              <Pause className="w-4 h-4 text-warning" />
              <span className="text-sm font-bold text-warning">Discussion Paused</span>
              <Button variant="outline" size="sm" onClick={handleTogglePause} className="border-2 h-7 text-xs">
                <Play className="w-3 h-3 mr-1" />
                Continue
              </Button>
            </div>
          )}

          {isWaitingForSpeech && (
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-1.5 sm:py-2 px-3 sm:px-4 bg-muted/50 rounded-lg border border-border">
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">Waiting for speech...</span>
              <Button
                variant="outline" size="sm"
                onClick={() => { if (skipWaitRef.current) { skipWaitRef.current(); } }}
                className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs"
              >
                <SkipForward className="w-3 h-3 mr-1" />
                Skip
              </Button>
            </div>
          )}

          <MessageInput
            userInput={userInput}
            isListening={isListening}
            isProcessing={isProcessing}
            isPracticing={isPracticing}
            isCorrecting={isCorrecting}
            isPaused={isPaused}
            isBusy={isWaitingForSpeech || isSpeaking}
            autoSendEnabled={autoSendEnabled}
            autoSkipEnabled={autoSkipEnabled}
            onInputChange={setUserInput}
            onSendMessage={handleSendMessage}
            onSendWithVoice={handleSendWithVoice}
            onVoiceInput={handleVoiceInput}
            onStartPractice={startPracticeRecording}
            onSkipTurn={() => {
              const lastUserMsg = [...messages].reverse().find(m => m.gd_participants?.is_user && m.gd_participants?.real_user_id === currentUserId);
              if (lastUserMsg?.text === "[Skipped turn]" && isProcessing) return;
              handleSendMessageDirect("[Skipped turn]");
            }}
            onOpenMobileMetrics={() => setIsMobileMetricsOpen(true)}
            onToggleAutoSend={() => setAutoSendEnabled(prev => !prev)}
            onToggleAutoSkip={() => setAutoSkipEnabled(prev => !prev)}
          />
        </div>

        {/* Right Sidebar - Desktop Only */}
        <SessionSidebar
          session={session}
          participants={participants}
          feedback={feedback}
          liveVoiceMetrics={liveVoiceMetrics}
          isListening={isListening}
          isSpeaking={isSpeaking}
          userInput={userInput}
          presenceState={presenceState}
          typingParticipants={typingParticipants}
          practiceHistory={practiceHistory}
          currentPlayingId={currentPlayingId}
          onVideoMetricsUpdate={handleVideoMetricsUpdate}
          onVoiceMetricsUpdate={setLiveVoiceMetrics}
          onPlayHistory={playHistoryRecording}
          onDeleteHistory={deleteHistoryRecording}
        />
      </div>

      {/* Mobile Metrics Sheet */}
      <Sheet open={isMobileMetricsOpen} onOpenChange={setIsMobileMetricsOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[350px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Session Metrics</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <Card className="p-3 border-2 border-border">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                LIVE FEEDBACK
              </h3>
              <FeedbackGrid feedback={feedback} liveVoiceMetrics={liveVoiceMetrics} />
            </Card>
            <Card className="p-3 border-2 border-border">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                PARTICIPANTS
                <Badge variant="secondary" className="ml-auto text-xs">{participants.length}</Badge>
              </h3>
              <ParticipantPresence
                participants={participants}
                presenceState={presenceState}
                typingParticipants={typingParticipants}
                isMultiplayer={session?.is_multiplayer ?? false}
              />
            </Card>
            <VoiceMetricsPanel
              isUserSpeaking={isListening && !isSpeaking}
              currentTranscript={userInput}
              sessionStartTime={session?.start_time ? new Date(session.start_time).getTime() : undefined}
              onMetricsUpdate={setLiveVoiceMetrics}
            />
            <PracticeHistory
              recordings={practiceHistory}
              onPlay={playHistoryRecording}
              onDelete={deleteHistoryRecording}
              currentlyPlaying={currentPlayingId}
            />
          </div>
        </SheetContent>
      </Sheet>

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
            <WPMDisplay
              isRecording={isRecordingPractice}
              recordingStartTime={recordingStartTime}
              estimatedWordCount={estimatedWordCount}
            />
            {practiceAudioUrl && (
              <div className="flex gap-2 justify-center">
                <Button onClick={playPracticeRecording} disabled={isPlayingPractice} variant="outline" className="border-2">
                  <Play className="w-4 h-4 mr-2" />
                  {isPlayingPractice ? 'PLAYING...' : 'PLAY'}
                </Button>
                <Button onClick={stopPracticeRecording} disabled={!isRecordingPractice} variant="outline" className="border-2">
                  <Square className="w-4 h-4 mr-2" />
                  STOP
                </Button>
              </div>
            )}
            {!practiceAudioUrl && !isRecordingPractice && (
              <p className="text-center text-muted-foreground font-mono">Click RECORD to start practicing</p>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            {!practiceAudioUrl && !isRecordingPractice && (
              <Button onClick={startPracticeRecording} className="border-4 border-border">
                <Mic className="w-4 h-4 mr-2" /> RECORD
              </Button>
            )}
            {isRecordingPractice && (
              <Button onClick={stopPracticeRecording} variant="destructive" className="border-4 border-border">
                <Square className="w-4 h-4 mr-2" /> STOP RECORDING
              </Button>
            )}
            {practiceAudioUrl && !isRecordingPractice && (
              <Button onClick={() => { cancelPractice(); startPracticeRecording(); }} variant="outline" className="border-2">
                <RefreshCw className="w-4 h-4 mr-2" /> RE-RECORD
              </Button>
            )}
            <Button onClick={cancelPractice} variant="outline" className="border-2">
              <X className="w-4 h-4 mr-2" /> CANCEL
            </Button>
            {practiceAudioUrl && !isRecordingPractice && (
              <Button onClick={handlePracticeAccept} className="border-4 border-border">
                <Check className="w-4 h-4 mr-2" /> ACCEPT
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscussionRoom;
