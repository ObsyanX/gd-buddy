import { useState, useRef, useCallback, useEffect } from 'react';
import { invokeWithAuth } from '@/lib/supabase-auth';

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
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isCorrecting, setIsCorrecting] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef('');
  const hasSpokenRef = useRef(false);

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

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    // Create new recognition instance
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Configure for real-time streaming
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    // Support multiple languages including Hinglish/Benglish
    recognition.lang = 'en-IN'; // Indian English handles code-switching better

    recognition.onstart = () => {
      setIsListening(true);
      finalTextRef.current = '';
      setFinalText('');
      setInterimText('');
      hasSpokenRef.current = false;
      console.log('Speech recognition started');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          final += transcript + ' ';
          hasSpokenRef.current = true;
        } else {
          interim += transcript;
          if (transcript.trim()) {
            hasSpokenRef.current = true;
          }
        }
      }

      // Update interim text immediately (like Google Keyboard)
      if (interim) {
        setInterimText(interim);
        onInterimResult?.(finalTextRef.current + interim);
      }

      // Accumulate final text
      if (final) {
        finalTextRef.current += final;
        setFinalText(finalTextRef.current);
        setInterimText('');
        onInterimResult?.(finalTextRef.current);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognition.onend = async () => {
      setIsListening(false);
      setInterimText('');
      
      // Apply AI correction to final text
      if (finalTextRef.current.trim()) {
        const corrected = await correctTranscription(finalTextRef.current.trim());
        setFinalText(corrected);
        onFinalResult?.(corrected);
        
        // Auto-send if enabled and there's text
        if (autoSend && corrected.trim()) {
          onAutoSend?.(corrected);
        }
      }
      
      console.log('Speech recognition ended');
    };

    recognition.start();
  }, [onInterimResult, onFinalResult, correctTranscription, autoSend, onAutoSend]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
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
