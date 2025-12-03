import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { PracticeRecording } from '@/components/PracticeHistory';

export const usePracticeMode = () => {
  const [isPracticing, setIsPracticing] = useState(false);
  const [isRecordingPractice, setIsRecordingPractice] = useState(false);
  const [practiceAudioUrl, setPracticeAudioUrl] = useState<string | null>(null);
  const [isPlayingPractice, setIsPlayingPractice] = useState(false);
  const [practiceHistory, setPracticeHistory] = useState<PracticeRecording[]>([]);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [currentRecordingDuration, setCurrentRecordingDuration] = useState(0);
  
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
      const startTime = Date.now();
      setRecordingStartTime(startTime);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        setCurrentRecordingDuration(duration);
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setPracticeAudioUrl(url);
        setIsRecordingPractice(false);
        setRecordingStartTime(null);

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
      setCurrentPlayingId(null);
    };

    audio.onerror = () => {
      setIsPlayingPractice(false);
      setCurrentPlayingId(null);
      toast({
        title: 'Playback failed',
        description: 'Could not play the recording',
        variant: 'destructive',
      });
    };

    setIsPlayingPractice(true);
    audio.play();
  };

  const playHistoryRecording = useCallback((recording: PracticeRecording) => {
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(recording.audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlayingPractice(false);
      setCurrentPlayingId(null);
    };

    audio.onerror = () => {
      setIsPlayingPractice(false);
      setCurrentPlayingId(null);
      toast({
        title: 'Playback failed',
        description: 'Could not play the recording',
        variant: 'destructive',
      });
    };

    setIsPlayingPractice(true);
    setCurrentPlayingId(recording.id);
    audio.play();
  }, [toast]);

  const stopPracticePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingPractice(false);
      setCurrentPlayingId(null);
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
    setRecordingStartTime(null);

    // Stop stream if still active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const acceptPractice = (transcription?: string | null, wpm?: number | null) => {
    // Save to history before clearing
    if (practiceAudioUrl) {
      const newRecording: PracticeRecording = {
        id: crypto.randomUUID(),
        audioUrl: practiceAudioUrl,
        timestamp: new Date(),
        duration: currentRecordingDuration,
        wpm: wpm || null,
        transcription: transcription || null,
      };
      setPracticeHistory(prev => [newRecording, ...prev]);
    }
    
    setIsPracticing(false);
    // Keep the audio URL for transcription
    return practiceAudioUrl;
  };

  const deleteHistoryRecording = useCallback((id: string) => {
    setPracticeHistory(prev => {
      const recording = prev.find(r => r.id === id);
      if (recording) {
        URL.revokeObjectURL(recording.audioUrl);
      }
      return prev.filter(r => r.id !== id);
    });
    
    if (currentPlayingId === id) {
      stopPracticePlayback();
    }
  }, [currentPlayingId]);

  const clearHistory = useCallback(() => {
    practiceHistory.forEach(recording => {
      URL.revokeObjectURL(recording.audioUrl);
    });
    setPracticeHistory([]);
  }, [practiceHistory]);

  return {
    isPracticing,
    isRecordingPractice,
    practiceAudioUrl,
    isPlayingPractice,
    practiceStream: streamRef.current,
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
    clearHistory,
  };
};
