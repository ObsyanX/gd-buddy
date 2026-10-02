import { useEffect, useRef, useCallback, useState } from "react";

interface UseClientVADOptions {
  stream: MediaStream | null;
  volumeThreshold?: number;
  silenceHangoverMs?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export const useClientVAD = ({
  stream,
  volumeThreshold = 0.025,
  silenceHangoverMs = 1200,
  onSpeechStart,
  onSpeechEnd,
}: UseClientVADOptions) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isSpeakingRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const checkVAD = useCallback(() => {
    if (
      !analyserRef.current ||
      audioContextRef.current?.state === "closed"
    ) {
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / dataArray.length);
    const now = performance.now();

    if (rms > volumeThreshold) {
      silenceStartRef.current = null;

      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        onSpeechStart?.();
      }
    } else if (isSpeakingRef.current) {
      if (silenceStartRef.current === null) {
        silenceStartRef.current = now;
      } else if (
        now - silenceStartRef.current >= silenceHangoverMs
      ) {
        isSpeakingRef.current = false;
        silenceStartRef.current = null;
        setIsSpeaking(false);
        onSpeechEnd?.();
      }
    }

    animationFrameRef.current = requestAnimationFrame(checkVAD);
  }, [
    volumeThreshold,
    silenceHangoverMs,
    onSpeechStart,
    onSpeechEnd,
  ]);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      return;
    }

    let ctx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioCtx) {
        console.warn("Web Audio API is not supported.");
        return;
      }

      ctx = new AudioCtx();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.15;

      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      if (ctx.state === "suspended") {
        void ctx.resume().catch(() => {});
      }

      animationFrameRef.current =
        requestAnimationFrame(checkVAD);
    } catch (err) {
      console.warn("VAD initialization skipped:", err);
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      try {
        source?.disconnect();
      } catch {}

      sourceRef.current = null;
      analyserRef.current = null;

      if (ctx && ctx.state !== "closed") {
        void ctx.close().catch(() => {});
      }

      audioContextRef.current = null;
      silenceStartRef.current = null;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    };
  }, [stream, checkVAD]);

  return {
    isSpeaking,
  };
};
