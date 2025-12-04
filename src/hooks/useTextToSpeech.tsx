import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { VoiceSettings } from '@/pages/Settings';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [volume, setVolume] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<Array<{ text: string; speaker?: string }>>([]);
  const isProcessingQueueRef = useRef(false);
  const { toast } = useToast();

  const speak = async (text: string, speaker?: string, participantVoice?: string) => {
    // Load voice settings from localStorage
    const savedSettings = localStorage.getItem('voiceSettings');
    const settings: VoiceSettings = savedSettings
      ? JSON.parse(savedSettings)
      : { voice: 'sarah', speed: 1.0 };

    // Use participant's voice if provided, otherwise fall back to user settings
    const voice = participantVoice || settings.voice;
    try {
      setIsSpeaking(true);
      setCurrentSpeaker(speaker || null);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice }
      });

      if (error) throw error;

      // Convert base64 to audio and play
      const audioBlob = base64ToBlob(data.audioContent, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setCurrentSpeaker(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setCurrentSpeaker(null);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Audio playback failed",
          description: "Could not play the audio",
          variant: "destructive",
        });
      };

      // Apply speed setting
      audio.playbackRate = settings.speed;
      await audio.play();
    } catch (error: any) {
      console.error('Error generating speech:', error);
      setIsSpeaking(false);
      setCurrentSpeaker(null);
      toast({
        title: "Text-to-speech failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
      setCurrentSpeaker(null);
    }
  };

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
