import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioMetrics {
  isSpeaking: boolean;
  volume: number;
  pitch: number;
  speakingRate: number; // words per minute estimate
  pauseCount: number;
  totalSpeakingTime: number;
  totalPauseTime: number;
  avgPauseLength: number;
}

interface UseAudioAnalysisOptions {
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onMetricsUpdate?: (metrics: AudioMetrics) => void;
  volumeThreshold?: number;
}

export const useAudioAnalysis = (options: UseAudioAnalysisOptions = {}) => {
  const { 
    onSpeakingChange, 
    onMetricsUpdate,
    volumeThreshold = 0.02 
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [metrics, setMetrics] = useState<AudioMetrics>({
    isSpeaking: false,
    volume: 0,
    pitch: 0,
    speakingRate: 0,
    pauseCount: 0,
    totalSpeakingTime: 0,
    totalPauseTime: 0,
    avgPauseLength: 0,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Tracking refs
  const speakingStartRef = useRef<number | null>(null);
  const pauseStartRef = useRef<number | null>(null);
  const totalSpeakingRef = useRef(0);
  const totalPauseRef = useRef(0);
  const pauseCountRef = useRef(0);
  const wasSpeakingRef = useRef(false);
  const lastVolumeRef = useRef(0);

  const analyze = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Float32Array(bufferLength);

    analyser.getByteTimeDomainData(dataArray);
    analyser.getFloatFrequencyData(frequencyData);

    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const value = (dataArray[i] - 128) / 128;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / bufferLength);
    const volume = Math.min(1, rms * 3); // Normalize to 0-1
    lastVolumeRef.current = volume;

    // Detect speaking based on volume threshold
    const isSpeaking = volume > volumeThreshold;
    const now = Date.now();

    // Track speaking/pause transitions
    if (isSpeaking && !wasSpeakingRef.current) {
      // Started speaking
      speakingStartRef.current = now;
      if (pauseStartRef.current) {
        const pauseDuration = (now - pauseStartRef.current) / 1000;
        if (pauseDuration > 0.3) { // Only count pauses > 300ms
          totalPauseRef.current += pauseDuration;
          pauseCountRef.current++;
        }
        pauseStartRef.current = null;
      }
      onSpeakingChange?.(true);
    } else if (!isSpeaking && wasSpeakingRef.current) {
      // Stopped speaking
      pauseStartRef.current = now;
      if (speakingStartRef.current) {
        totalSpeakingRef.current += (now - speakingStartRef.current) / 1000;
        speakingStartRef.current = null;
      }
      onSpeakingChange?.(false);
    }

    wasSpeakingRef.current = isSpeaking;

    // Estimate pitch from frequency data
    let maxIndex = 0;
    let maxValue = -Infinity;
    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxValue) {
        maxValue = frequencyData[i];
        maxIndex = i;
      }
    }
    const pitch = (maxIndex * (audioContextRef.current?.sampleRate || 44100)) / (2 * bufferLength);

    // Calculate current totals including ongoing speaking/pause
    let currentSpeaking = totalSpeakingRef.current;
    let currentPause = totalPauseRef.current;
    
    if (isSpeaking && speakingStartRef.current) {
      currentSpeaking += (now - speakingStartRef.current) / 1000;
    }
    if (!isSpeaking && pauseStartRef.current) {
      currentPause += (now - pauseStartRef.current) / 1000;
    }

    // Estimate words per minute (rough estimate: ~150 WPM when speaking)
    const speakingRate = currentSpeaking > 0 ? Math.round(150 * (volume / 0.3)) : 0;
    const avgPauseLength = pauseCountRef.current > 0 
      ? currentPause / pauseCountRef.current 
      : 0;

    const newMetrics: AudioMetrics = {
      isSpeaking,
      volume,
      pitch: Math.round(pitch),
      speakingRate: Math.min(200, Math.max(0, speakingRate)),
      pauseCount: pauseCountRef.current,
      totalSpeakingTime: currentSpeaking,
      totalPauseTime: currentPause,
      avgPauseLength,
    };

    setMetrics(newMetrics);
    onMetricsUpdate?.(newMetrics);

    animationRef.current = requestAnimationFrame(analyze);
  }, [volumeThreshold, onSpeakingChange, onMetricsUpdate]);

  const startAnalysis = useCallback(async (existingStream?: MediaStream) => {
    try {
      // Use existing stream or create new one
      const stream = existingStream || await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Reset tracking
      totalSpeakingRef.current = 0;
      totalPauseRef.current = 0;
      pauseCountRef.current = 0;
      wasSpeakingRef.current = false;
      speakingStartRef.current = null;
      pauseStartRef.current = Date.now();

      setIsActive(true);
      analyze();

      console.log('Audio analysis started');
    } catch (error) {
      console.error('Failed to start audio analysis:', error);
    }
  }, [analyze]);

  const stopAnalysis = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Don't stop stream if it was provided externally
    analyserRef.current = null;
    setIsActive(false);
    
    console.log('Audio analysis stopped');
  }, []);

  const getSessionMetrics = useCallback(() => {
    const totalTime = totalSpeakingRef.current + totalPauseRef.current;
    return {
      totalSpeakingTime: totalSpeakingRef.current,
      totalPauseTime: totalPauseRef.current,
      pauseCount: pauseCountRef.current,
      avgPauseLength: pauseCountRef.current > 0 
        ? totalPauseRef.current / pauseCountRef.current 
        : 0,
      speakingRatio: totalTime > 0 
        ? totalSpeakingRef.current / totalTime 
        : 0,
    };
  }, []);

  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  return {
    isActive,
    metrics,
    startAnalysis,
    stopAnalysis,
    getSessionMetrics,
  };
};
