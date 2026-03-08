import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { invokeWithAuth } from '@/lib/supabase-auth';
import { useVoiceStore } from '@/stores/useVoiceStore';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [usingFallbackTTS, setUsingFallbackTTS] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const elevenLabsSuccessRef = useRef(false); // Track if ElevenLabs succeeded
  const { toast } = useToast();

  // Browser speech synthesis fallback
  const speakWithBrowserTTS = useCallback((text: string, speaker?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentSpeaker(null);
        resolve();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        setCurrentSpeaker(null);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      setIsSpeaking(true);
      setCurrentSpeaker(speaker || null);
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  // Returns a promise that resolves when audio finishes playing
  const speak = useCallback(async (text: string, speaker?: string, participantVoice?: string): Promise<void> => {
    // Read voice settings from Zustand store
    const storeState = useVoiceStore.getState();
    const voice = participantVoice || storeState.voice;
    const settings = { voice: storeState.voice, speed: storeState.speed };

    return new Promise(async (resolve, reject) => {
      // Reset the success flag at the start
      elevenLabsSuccessRef.current = false;
      
      try {
        setIsSpeaking(true);
        setCurrentSpeaker(speaker || null);

        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Also stop any browser TTS that might be playing
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }

        const { data, error } = await invokeWithAuth('text-to-speech', {
          body: { text, voice }
        });

        if (error || !data?.audioContent) {
          console.warn('ElevenLabs TTS unavailable, using browser TTS:', error?.message || 'No audio content');
          setUsingFallbackTTS(true);
          try {
            await speakWithBrowserTTS(text, speaker);
            resolve();
            return;
          } catch (browserError) {
            throw browserError;
          }
        }

        // Mark ElevenLabs as successful - no browser fallback needed
        elevenLabsSuccessRef.current = true;

        // Convert base64 to audio and play
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        // Cancel browser TTS again right before playing to be safe
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }

        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentSpeaker(null);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = async () => {
          setIsSpeaking(false);
          setCurrentSpeaker(null);
          URL.revokeObjectURL(audioUrl);
          
          if (elevenLabsSuccessRef.current) {
            console.warn('Audio playback failed, falling back to browser TTS');
            elevenLabsSuccessRef.current = false;
            try {
              await speakWithBrowserTTS(text, speaker);
              resolve();
            } catch {
              resolve(); // Silently resolve - no popup
            }
          } else {
            resolve(); // Silently resolve - no popup
          }
        };

        // Apply speed setting
        audio.playbackRate = settings.speed;
        await audio.play();
      } catch (error: any) {
        console.warn('TTS error, falling back to browser TTS:', error?.message || error);
        setUsingFallbackTTS(true);
        
        // Try browser TTS as final fallback - never show error popup
        try {
          await speakWithBrowserTTS(text, speaker);
          resolve();
          return;
        } catch {
          setIsSpeaking(false);
          setCurrentSpeaker(null);
          resolve(); // Silently resolve - no popup
        }
      }
    });
  }, [speakWithBrowserTTS, toast]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Also stop browser TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentSpeaker(null);
  }, []);

  return {
    isSpeaking,
    currentSpeaker,
    speak,
    stop
  };
};

// Helper function to convert base64 to blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};
