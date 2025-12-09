import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseStreamingTranscriptionOptions {
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  context?: string;
  enableAICorrection?: boolean;
}

export const useStreamingTranscription = (options: UseStreamingTranscriptionOptions = {}) => {
  const { onInterimResult, onFinalResult, context, enableAICorrection = true } = options;
  
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef('');

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
      const { data, error } = await supabase.functions.invoke('transcription-correction', {
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
    }
  }, [context, enableAICorrection]);

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
      console.log('Speech recognition started');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
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
      }
      
      console.log('Speech recognition ended');
    };

    recognition.start();
  }, [onInterimResult, onFinalResult, correctTranscription]);

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

  // Get current display text (final + interim)
  const displayText = finalText + interimText;

  return {
    isListening,
    isSupported,
    interimText,
    finalText,
    displayText,
    startListening,
    stopListening,
    toggleListening,
  };
};
