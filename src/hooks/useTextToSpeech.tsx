import { useState, useRef, useCallback } from "react";
import { invokeWithAuth } from "@/lib/supabase-auth";
import { useVoiceStore } from "@/stores/useVoiceStore";

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [usingFallbackTTS, setUsingFallbackTTS] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playbackIdRef = useRef(0);
  const elevenLabsSuccessRef = useRef(false);

  // Browser speech synthesis fallback
  const speakWithBrowserTTS = useCallback(
    (text: string, speaker?: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!("speechSynthesis" in window)) {
          reject(
            new Error("Browser speech synthesis not supported")
          );
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

          reject(
            new Error(
              `Speech synthesis error: ${event.error}`
            )
          );
        };

        setIsSpeaking(true);
        setCurrentSpeaker(speaker || null);

        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  // Direct Web Audio playback
  const playAudioBuffer = useCallback(
    async (
      base64Audio: string,
      rate: number,
      playbackId: number
    ): Promise<void> => {
      // Convert base64 to ArrayBuffer
      const binaryString = window.atob(base64Audio);

      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Get AudioContext
      const AudioCtx =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioCtx) {
        throw new Error(
          "Web Audio API is not supported by this browser"
        );
      }

      const ctx = new AudioCtx();

      audioContextRef.current = ctx;

      // Resume suspended context
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Decode audio directly
      const audioBuffer = await ctx.decodeAudioData(
        bytes.buffer.slice(0)
      );

      // Check whether playback was cancelled while decoding
      if (playbackId !== playbackIdRef.current) {
        if (ctx.state !== "closed") {
          await ctx.close().catch(() => {});
        }

        return;
      }

      // Create audio source
      const source = ctx.createBufferSource();

      source.buffer = audioBuffer;

      // Apply playback speed
      const safeRate =
        Number.isFinite(rate) && rate > 0
          ? rate
          : 1.0;

      source.playbackRate.value = safeRate;

      // Connect to speakers
      source.connect(ctx.destination);

      audioSourceRef.current = source;

      return new Promise<void>((resolve, reject) => {
        let settled = false;

        const cleanup = async () => {
          if (audioSourceRef.current === source) {
            audioSourceRef.current = null;
          }

          if (audioContextRef.current === ctx) {
            audioContextRef.current = null;
          }

          if (ctx.state !== "closed") {
            await ctx.close().catch(() => {});
          }
        };

        source.onended = async () => {
          if (settled) return;

          settled = true;

          await cleanup();

          if (playbackId === playbackIdRef.current) {
            setIsSpeaking(false);
            setCurrentSpeaker(null);
          }

          resolve();
        };

        try {
          source.start(0);
        } catch (error) {
          if (settled) return;

          settled = true;

          await cleanup();

          reject(error);
        }
      });
    },
    []
  );

  // Speak
  const speak = useCallback(
    async (
      text: string,
      speaker?: string,
      participantVoice?: string
    ): Promise<void> => {
      const storeState = useVoiceStore.getState();

      const voice =
        participantVoice || storeState.voice;

      const settings = {
        voice: storeState.voice,
        speed: storeState.speed,
      };

      // New playback ID
      const playbackId = ++playbackIdRef.current;

      elevenLabsSuccessRef.current = false;

      try {
        setIsSpeaking(true);
        setCurrentSpeaker(speaker || null);
        setUsingFallbackTTS(false);

        // Stop current Web Audio playback
        if (audioSourceRef.current) {
          try {
            audioSourceRef.current.stop();
          } catch {
            // Source may already have ended
          }

          audioSourceRef.current = null;
        }

        // Close current AudioContext
        if (audioContextRef.current) {
          const previousContext =
            audioContextRef.current;

          audioContextRef.current = null;

          if (previousContext.state !== "closed") {
            await previousContext
              .close()
              .catch(() => {});
          }
        }

        // Stop legacy HTML audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }

        // Stop browser TTS
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }

        // Request ElevenLabs TTS
        const { data, error } =
          await invokeWithAuth("text-to-speech", {
            body: {
              text,
              voice,
            },
          });

        // ElevenLabs unavailable
        if (error || !data?.audioContent) {
          console.warn(
            "ElevenLabs TTS unavailable, using browser TTS:",
            error?.message || "No audio content"
          );

          setUsingFallbackTTS(true);

          try {
            await speakWithBrowserTTS(text, speaker);
            return;
          } catch (browserError) {
            throw browserError;
          }
        }

        // ElevenLabs succeeded
        elevenLabsSuccessRef.current = true;

        // Make sure browser TTS is stopped
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }

        // Play directly through Web Audio
        await playAudioBuffer(
          data.audioContent,
          settings.speed,
          playbackId
        );
      } catch (error: any) {
        // Ignore old playback errors
        if (playbackId !== playbackIdRef.current) {
          return;
        }

        console.warn(
          "TTS error, falling back to browser TTS:",
          error?.message || error
        );

        setUsingFallbackTTS(true);

        try {
          await speakWithBrowserTTS(text, speaker);
        } catch {
          setIsSpeaking(false);
          setCurrentSpeaker(null);
        }
      }
    },
    [
      playAudioBuffer,
      speakWithBrowserTTS,
    ]
  );

  // Stop all TTS playback
  const stop = useCallback(() => {
    // Invalidate pending playback
    playbackIdRef.current += 1;

    // Stop Web Audio source
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        // Source may already have ended
      }

      audioSourceRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;

      audioContextRef.current = null;

      if (ctx.state !== "closed") {
        ctx.close().catch(() => {});
      }
    }

    // Stop HTML audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Stop browser TTS
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setCurrentSpeaker(null);
  }, []);

  return {
    isSpeaking,
    currentSpeaker,
    usingFallbackTTS,
    speak,
    stop,
  };
};
