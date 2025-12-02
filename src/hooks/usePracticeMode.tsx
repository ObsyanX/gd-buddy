import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export const usePracticeMode = () => {
  const [isPracticing, setIsPracticing] = useState(false);
  const [isRecordingPractice, setIsRecordingPractice] = useState(false);
  const [practiceAudioUrl, setPracticeAudioUrl] = useState<string | null>(null);
  const [isPlayingPractice, setIsPlayingPractice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startPracticeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setPracticeAudioUrl(url);
        setIsRecordingPractice(false);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecordingPractice(true);
      setIsPracticing(true);
    } catch (error: any) {
      console.error('Error starting practice recording:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to use practice mode',
        variant: 'destructive',
      });
    }
  };

  const stopPracticeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const playPracticeRecording = () => {
    if (!practiceAudioUrl) return;

    const audio = new Audio(practiceAudioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlayingPractice(false);
    };

    audio.onerror = () => {
      setIsPlayingPractice(false);
      toast({
        title: 'Playback failed',
        description: 'Could not play the recording',
        variant: 'destructive',
      });
    };

    setIsPlayingPractice(true);
    audio.play();
  };

  const stopPracticePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingPractice(false);
    }
  };

  const cancelPractice = () => {
    stopPracticePlayback();
    if (practiceAudioUrl) {
      URL.revokeObjectURL(practiceAudioUrl);
    }
    setPracticeAudioUrl(null);
    setIsPracticing(false);
    setIsRecordingPractice(false);

    // Stop stream if still active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const acceptPractice = () => {
    setIsPracticing(false);
    // Keep the audio URL for transcription
    return practiceAudioUrl;
  };

  return {
    isPracticing,
    isRecordingPractice,
    practiceAudioUrl,
    isPlayingPractice,
    practiceStream: streamRef.current,
    startPracticeRecording,
    stopPracticeRecording,
    playPracticeRecording,
    stopPracticePlayback,
    cancelPractice,
    acceptPractice,
  };
};
