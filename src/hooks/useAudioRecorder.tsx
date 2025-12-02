import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          
          if (!base64Audio) {
            setIsProcessing(false);
            resolve(null);
            return;
          }

          try {
            const { data, error } = await supabase.functions.invoke('speech-to-text', {
              body: { audio: base64Audio }
            });

            if (error) throw error;

            setIsProcessing(false);
            resolve(data.text);
          } catch (error: any) {
            console.error('Error transcribing audio:', error);
            toast({
              title: "Transcription failed",
              description: error.message || "Please try again",
              variant: "destructive",
            });
            setIsProcessing(false);
            resolve(null);
          }
        };

        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.stop();
    });
  };

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  };
};
