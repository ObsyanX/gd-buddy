import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useState, useRef, useCallback, useEffect } from 'react';
import { invokeWithAuth } from '@/lib/supabase-auth';
import { supabase } from '@/integrations/supabase/client';

// Cached per page load (refreshed every 2 minutes) so each utterance doesn't re-query.
let sttKeyCache: { value: boolean; at: number } | null = null;
export async function hasOwnSttKey(): Promise<boolean> {
  if (sttKeyCache && Date.now() - sttKeyCache.at < 120_000) return sttKeyCache.value;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const { data } = await supabase.from('user_provider_credentials')
      .select('provider').eq('user_id', session.user.id).eq('category', 'stt').eq('enabled', true).limit(1);
    const value = !!data?.length;
    sttKeyCache = { value, at: Date.now() };
    return value;
  } catch { return false; }
}

/** Sends recorded audio through the user's saved speech-to-text key. Returns null on failure. */
async function transcribeWithOwnKey(blob: Blob): Promise<string | null> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const { data, error } = await invokeWithAuth<{ text?: string; provider?: string; byok?: boolean }>('speech-to-text', { body: { audio: btoa(bin) } });
  if (error || typeof data?.text !== 'string') {
    console.warn('Your speech-to-text key failed; using the browser transcript:', error?.message);
    return null;
  }
  console.log(`Transcribed by ${data.provider}${data.byok ? ' (your key)' : ''}`);
  return data.text.trim();
}

/** Consecutive browser-initiated restarts allowed without hearing anything. */
export const MAX_AUTO_RESTARTS = 5;

interface UseStreamingTranscriptionOptions {
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onCorrectionStart?: () => void;
  onCorrectionEnd?: () => void;
  context?: string;
  enableAICorrection?: boolean;
  autoSend?: boolean;
  onAutoSend?: (text: string) => void;
}

export const useStreamingTranscription = (options: UseStreamingTranscriptionOptions = {}) => {
  const { 
    onInterimResult, 
    onFinalResult, 
    onCorrectionStart,
    onCorrectionEnd,
    context, 
    enableAICorrection = true,
    autoSend = false,
    onAutoSend
  } = options;
  
  const [isListening, setIsListening] = useState(false);
  const [isMicInitializing, setIsMicInitializing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isCorrecting, setIsCorrecting] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<{ rec: MediaRecorder; done: Promise<Blob | null> } | null>(null);
  const prefixRef = useRef('');
  const finalTextRef = useRef('');
  const hasSpokenRef = useRef(false);
  const isMountedRef = useRef(true);
  // Browsers (Android Chrome especially) may end a recognition session on
  // their own during a thinking pause. Until the user taps Done, we quietly
  // restart it so the answer stays open and nothing heard so far is lost.
  const autoRestartsRef = useRef(0);
  const fatalErrorRef = useRef(false);
  const lastInterimRef = useRef('');

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      console.warn('Web Speech API not supported in this browser');
    }
  }, []);

  // AI correction for final transcription
  const correctTranscription = useCallback(async (rawText: string): Promise<string> => {
    if (!rawText || rawText.trim().length === 0 || !enableAICorrection) return rawText;

    try {
      setIsCorrecting(true);
      onCorrectionStart?.();
      
      const { data, error } = await invokeWithAuth('transcription-correction', {
        body: { rawTranscription: rawText, context }
      });

      if (error) {
        console.error('Transcription correction error:', error);
        return rawText;
      }

      return data?.correctedText || rawText;
    } catch (err) {
      console.error('Failed to correct transcription:', err);
      return rawText;
    } finally {
      setIsCorrecting(false);
      onCorrectionEnd?.();
    }
  }, [context, enableAICorrection, onCorrectionStart, onCorrectionEnd]);

  const startListening = useCallback((existingText?: string) => {
    setIsMicInitializing(true);
    autoRestartsRef.current = 0;
    fatalErrorRef.current = false;
    lastInterimRef.current = '';
    // Anything the user already typed is preserved and prepended to whatever
    // the recogniser hears, so switching the mic on never wipes typed text.
    prefixRef.current = existingText && existingText.trim() ? existingText.trim() + ' ' : '';
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    
    if (!SpeechRecognition) {
      setIsMicInitializing(false);
      console.error('Speech recognition not supported');
      return;
    }
      const VERNACULAR_NORMALIZERS: [RegExp, string][] = [
  [/\b(lacs?)\b/gi, "lakhs"],
  [/\b(cror?es?)\b/gi, "crores"],
  [/\b(p\s*o\s*v)\b/gi, "POV"],
  [/\b(c\s*t\s*c)\b/gi, "CTC"],
  [/\b(g\s*d)\b/gi, "GD"],
  [/\b(i\s*i\s*m)\b/gi, "IIM"],
  [/\b(jugaad?)\b/gi, "jugaad"],
  [/\b(funda?s?)\b/gi, "fundas"],
];

function normalizeVernacular(text: string): string {
  let normalized = text;

  for (const [pattern, replacement] of VERNACULAR_NORMALIZERS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized;
}
    // Create new recognition instance
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Configure for real-time streaming
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    // Language chosen in Settings (default Indian English, best for Hinglish)
    recognition.lang = useAppSettingsStore.getState().captionLanguage || 'en-IN';

    recognition.onstart = () => {
      if (!isMountedRef.current) return;
      setIsMicInitializing(false);
      setIsListening(true);
      finalTextRef.current = '';
      setFinalText(prefixRef.current);
      setInterimText('');
      if (autoRestartsRef.current === 0) hasSpokenRef.current = false;
      console.log('Speech recognition started');
    };

    recognition.onresult = (event: any) => {
      if (!isMountedRef.current) return;
      // Build full transcript from all results to avoid duplication
      let fullFinal = '';
      let latestInterim = '';

      // Iterate through ALL results to build the complete transcript
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          fullFinal += transcript + ' ';
          hasSpokenRef.current = true;
        } else {
          // Only take the latest interim result (not accumulated)
          latestInterim = transcript;
          if (transcript.trim()) {
            hasSpokenRef.current = true;
          }
        }
      }

      autoRestartsRef.current = 0;
      lastInterimRef.current = latestInterim;

      // Update final text reference with complete final transcript
      finalTextRef.current = prefixRef.current + fullFinal;
      setFinalText(finalTextRef.current);

      // Update interim text with only the latest non-final segment
      setInterimText(latestInterim);
      
      // Callback with complete text (typed prefix + final + current interim)
      const displayText = normalizeVernacular(
          (prefixRef.current + fullFinal + latestInterim).trim()
      );
      onInterimResult?.(displayText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (!isMountedRef.current) return;
      // An error before `onstart` (network, not-allowed, service-not-allowed)
      // means initialisation failed — always release the initializing state so
      // the mic button is never stuck disabled.
      setIsMicInitializing(false);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        // Permission, device or network problems: do not auto-restart.
        fatalErrorRef.current = true;
        setIsListening(false);
      }
    };

    // If the user saved their own speech-to-text key, record the audio in
    // parallel; the browser recogniser only drives the live preview and the
    // final text comes from the user's key.
    void (async () => {
      if (!(await hasOwnSttKey())) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (recognitionRef.current !== recognition) { stream.getTracks().forEach((t) => t.stop()); return; }
        const rec = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        const done = new Promise<Blob | null>((res) => {
          rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); res(chunks.length ? new Blob(chunks, { type: rec.mimeType || 'audio/webm' }) : null); };
        });
        rec.start();
        recorderRef.current = { rec, done };
      } catch (e) {
        console.warn('Could not record audio for your speech-to-text key:', e);
      }
    })();

    recognition.onend = async () => {
      if (!isMountedRef.current) return;

      // Ended by the browser (not by stopListening): keep the turn open.
      if (
        recognitionRef.current === recognition &&
        !fatalErrorRef.current &&
        autoRestartsRef.current < MAX_AUTO_RESTARTS
      ) {
        autoRestartsRef.current += 1;
        const heardFinal = finalTextRef.current.trim() || prefixRef.current.trim();
        const heard = [heardFinal, lastInterimRef.current.trim()].filter(Boolean).join(' ');
        prefixRef.current = heard ? heard + ' ' : '';
        lastInterimRef.current = '';
        try {
          recognition.start();
          console.log(`Speech recognition paused by the browser — resumed (${autoRestartsRef.current}/${MAX_AUTO_RESTARTS})`);
          return;
        } catch (err) {
          console.warn('Could not resume speech recognition:', err);
        }
      }

      setIsMicInitializing(false);
      setIsListening(false);
      setInterimText('');

      const r = recorderRef.current;
      recorderRef.current = null;
      if (r) {
        try { if (r.rec.state !== 'inactive') r.rec.stop(); } catch { /* ignore */ }
        const blob = await r.done;
        if (blob && blob.size > 2000) {
          const text = await transcribeWithOwnKey(blob);
          if (!isMountedRef.current) return;
          if (text !== null) finalTextRef.current = prefixRef.current + text;
        }
      }
      
      // Apply AI correction to final text
      if (finalTextRef.current.trim()) {
        const corrected = await correctTranscription(finalTextRef.current.trim());
        if (!isMountedRef.current) return;
        setFinalText(corrected);
        onFinalResult?.(corrected);
        
        // Auto-send if enabled and there's text
        if (autoSend && corrected.trim()) {
          onAutoSend?.(corrected);
        }
      } else {
        // Nothing was recognised. Whatever the user typed before opening the
        // mic must still be reported, otherwise a pending send is dropped.
        const typed = prefixRef.current.trim();
        if (typed) {
          setFinalText(typed);
          onFinalResult?.(typed);
          if (autoSend) {
            onAutoSend?.(typed);
          }
        }
      }
      
      console.log('Speech recognition ended');
    };

    try {
      recognition.start();
      // Safety net: if neither onstart nor onerror fires within 8s (speech
      // service unreachable), release the UI so the mic button recovers.
      const started = recognition;
      window.setTimeout(() => {
        if (recognitionRef.current === started && isMountedRef.current) {
          setIsMicInitializing((prev) => {
            if (prev) {
              console.warn('Speech recognition start timed out — releasing mic UI');
              try { started.abort?.(); } catch { /* ignore */ }
              recognitionRef.current = null;
            }
            return false;
          });
        }
      }, 8000);
    } catch (error) {
      console.warn('Speech recognition start failed:', error);
      recognitionRef.current = null;
      setIsMicInitializing(false);
      setIsListening(false);
    }
  }, [onInterimResult, onFinalResult, correctTranscription, autoSend, onAutoSend]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Speech recognition stop failed:', error);
      }
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort?.();
        } catch {
          try { recognitionRef.current.stop?.(); } catch {}
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clear the transcription state
  const clearTranscription = useCallback(() => {
    prefixRef.current = '';
    finalTextRef.current = '';
    setFinalText('');
    setInterimText('');
  }, []);

  // Check if user has spoken during this session
  const hasSpoken = hasSpokenRef.current;

  // Get current display text (final + interim)
  const displayText = finalText + interimText;

  return {
    isListening,
    isMicInitializing,
    isSupported,
    isCorrecting,
    interimText,
    finalText,
    displayText,
    hasSpoken,
    startListening,
    stopListening,
    toggleListening,
    clearTranscription,
  };
};
