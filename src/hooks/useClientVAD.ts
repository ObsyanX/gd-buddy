import { useEffect, useRef, useState } from "react";

interface UseClientVADOptions {
  stream: MediaStream | null;
  /** Minimum loudness; the real cut-off adapts to background noise. */
  volumeThreshold?: number;
  silenceHangoverMs?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

/**
 * Client-side voice activity detection.
 * - Measures background noise for the first ~600ms, then uses
 *   max(volumeThreshold, noise * 2.5) as the speech cut-off.
 * - Needs ~120ms of continuous sound to start (ignores clicks).
 * - Releases after silenceHangoverMs of quiet (default 1400ms).
 * - Callbacks are kept in refs so the audio graph is never rebuilt
 *   on re-render (that previously caused random cut-offs).
 */
export const useClientVAD = ({
  stream,
  volumeThreshold = 0.02,
  silenceHangoverMs = 1400,
  onSpeechStart,
  onSpeechEnd,
}: UseClientVADOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const startRef = useRef(onSpeechStart);
  const endRef = useRef(onSpeechEnd);
  const cfgRef = useRef({ volumeThreshold, silenceHangoverMs });
  startRef.current = onSpeechStart;
  endRef.current = onSpeechEnd;
  cfgRef.current = { volumeThreshold, silenceHangoverMs };

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return;
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    let ctx: AudioContext;
    let source: MediaStreamAudioSourceNode;
    try {
      ctx = new AudioCtx();
      source = ctx.createMediaStreamSource(stream);
    } catch (err) {
      console.warn("VAD initialization skipped:", err);
      return;
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});

    const data = new Uint8Array(analyser.fftSize);
    const begin = performance.now();
    let noiseSum = 0;
    let noiseCount = 0;
    let noiseFloor = 0;
    let speaking = false;
    let loudSince: number | null = null;
    let quietSince: number | null = null;
    let raf = 0;

    const tick = () => {
      if (ctx.state === "closed") return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const now = performance.now();

      if (now - begin < 600) {
        noiseSum += rms;
        noiseCount++;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (noiseCount && !noiseFloor) noiseFloor = noiseSum / noiseCount;
      // Slowly follow background noise while nobody is talking.
      if (!speaking && rms < noiseFloor * 2) noiseFloor = noiseFloor * 0.995 + rms * 0.005;

      const { volumeThreshold: minT, silenceHangoverMs: hang } = cfgRef.current;
      const threshold = Math.max(minT, noiseFloor * 2.5);

      if (rms > threshold) {
        quietSince = null;
        if (!speaking) {
          loudSince ??= now;
          if (now - loudSince >= 120) {
            speaking = true;
            loudSince = null;
            setIsSpeaking(true);
            startRef.current?.();
          }
        }
      } else {
        loudSince = null;
        if (speaking) {
          quietSince ??= now;
          if (now - quietSince >= hang) {
            speaking = false;
            quietSince = null;
            setIsSpeaking(false);
            endRef.current?.();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      try { source.disconnect(); } catch { /* noop */ }
      if (ctx.state !== "closed") void ctx.close().catch(() => {});
      setIsSpeaking(false);
    };
  }, [stream]);

  return { isSpeaking };
};
