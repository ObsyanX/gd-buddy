import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBrowserWhisper } from '@/hooks/useBrowserWhisper';
import { safeStopMediaStream } from '@/lib/audio-utils';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopPromiseRef = useRef<Promise<string | null> | null>(null);
  const { toast } = useToast();
  const { isTranscribing, isModelLoading, transcribeAudio } = useBrowserWhisper();

  const cleanupRecorder = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch (error) { console.warn('[Recorder] stop failed during cleanup', error); }
    }
    safeStopMediaStream(streamRef.current || recorder?.stream || null);
    streamRef.current = null;
    mediaRecorderRef.current = null;
  };

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
      streamRef.current = stream;

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
    if (stopPromiseRef.current) return stopPromiseRef.current;

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      safeStopMediaStream(streamRef.current);
      streamRef.current = null;
      mediaRecorderRef.current = null;
      return null;
    }

    stopPromiseRef.current = new Promise<string | null>((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Use browser-based Whisper for transcription
        const transcription = await transcribeAudio(audioBlob);
        
        // Stop all tracks
        safeStopMediaStream(streamRef.current || mediaRecorderRef.current?.stream || null);
        streamRef.current = null;
        mediaRecorderRef.current = null;
        stopPromiseRef.current = null;
        
        resolve(transcription);
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.warn('[Recorder] stop failed', error);
        safeStopMediaStream(streamRef.current || mediaRecorderRef.current?.stream || null);
        streamRef.current = null;
        mediaRecorderRef.current = null;
        stopPromiseRef.current = null;
        resolve(null);
      }
    });

    return stopPromiseRef.current;
  };

  useEffect(() => cleanupRecorder, []);

  return {
    isRecording,
    isProcessing: isTranscribing || isModelLoading,
    isModelLoading,
    startRecording,
    stopRecording
  };
};
