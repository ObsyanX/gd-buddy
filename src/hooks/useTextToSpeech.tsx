import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { invokeWithAuth } from '@/lib/supabase-auth';
import type { VoiceSettings } from '@/pages/Settings';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    // Load voice settings from localStorage
    const savedSettings = localStorage.getItem('voiceSettings');
    const settings: VoiceSettings = savedSettings
      ? JSON.parse(savedSettings)
      : { voice: 'sarah', speed: 1.0 };

    // Use participant's voice if provided, otherwise fall back to user settings
    const voice = participantVoice || settings.voice;

    return new Promise(async (resolve, reject) => {
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

        if (error) {
          console.warn('ElevenLabs TTS failed, falling back to browser TTS:', error);
          // Fallback to browser TTS
          try {
            await speakWithBrowserTTS(text, speaker);
            resolve();
            return;
          } catch (browserError) {
            throw browserError;
          }
        }

        // Convert base64 to audio and play
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

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
          
          // Fallback to browser TTS on audio error
          console.warn('Audio playback failed, falling back to browser TTS');
          try {
            await speakWithBrowserTTS(text, speaker);
            resolve();
          } catch (browserError) {
            toast({
              title: "Audio playback failed",
              description: "Could not play the audio",
              variant: "destructive",
            });
            reject(new Error('Audio playback failed'));
          }
        };

        // Apply speed setting
        audio.playbackRate = settings.speed;
        await audio.play();
      } catch (error: any) {
        console.error('Error generating speech:', error);
        
        // Try browser TTS as final fallback
        try {
          await speakWithBrowserTTS(text, speaker);
          resolve();
          return;
        } catch (browserError) {
          setIsSpeaking(false);
          setCurrentSpeaker(null);
          toast({
            title: "Text-to-speech failed",
            description: "Please try again",
            variant: "destructive",
          });
          reject(error);
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
