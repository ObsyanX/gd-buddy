// Phase A — Overlap-capable room audio engine.
//
// Replaces the "one HTMLAudioElement at a time" model with a Web Audio graph
// that can play several speakers simultaneously, duck the person being
// interrupted, and place each persona at a seat around the table.
//
//   BufferSource -> GainNode (duckable) -> StereoPanner (seat) -> master -> out
//
// The mixer keeps a `busyUntil` clock so callers can schedule a barge-in that
// starts `overlapSeconds` BEFORE the current speaker finishes.

import { invokeWithAuth } from '@/lib/supabase-auth';
import { useVoiceStore } from '@/stores/useVoiceStore';

export interface SpeakOptions {
  /** Stable id used for seat placement + speaking indicators. */
  speakerId: string;
  speaker?: string;
  /** 0..1 position around the table (0 = far left, 1 = far right). */
  seat?: number;
  /** Seconds of overlap with the currently scheduled speaker. */
  overlapSeconds?: number;
  /** True when this utterance is a barge-in (ducks the other speaker). */
  interruption?: boolean;
  /** Relative loudness 0..1 (backchannels are quieter than full turns). */
  gain?: number;
  /** Prosody rate multiplier from SSML hints (multiplied with user speed). */
  rate?: number;
  /** Prosody pitch offset in cents from SSML hints. */
  detune?: number;
}


export interface PreparedClip {
  text: string;
  buffer: AudioBuffer | null;
  voice?: string;
}

const MAX_OVERLAP = 2.5;
const DUCK_GAIN = 0.32;

type Listener = (speakers: string[]) => void;

class RoomMixer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private active = new Map<string, { gain: GainNode; source: AudioBufferSourceNode; base: number }>();
  private listeners = new Set<Listener>();
  private busyUntil = 0;
  private stopped = false;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private emit() {
    const ids = [...this.active.keys()];
    this.listeners.forEach((l) => l(ids));
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Fetch + decode TTS audio ahead of time so scheduling is latency-free. */
  async prepare(text: string, voice?: string): Promise<PreparedClip> {
    const ctx = this.ensureCtx();
    const storeVoice = useVoiceStore.getState().voice;
    const useVoice = voice || storeVoice;
    if (!ctx) return { text, buffer: null, voice: useVoice };
    try {
      const { data, error } = await invokeWithAuth('text-to-speech', {
        body: { text, voice: useVoice },
      });
      if (error || !data?.audioContent) return { text, buffer: null, voice: useVoice };
      const bytes = base64ToBytes(data.audioContent);
      const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
      return { text, buffer, voice: useVoice };
    } catch {
      return { text, buffer: null, voice: useVoice };
    }
  }

  /** Seconds until the floor frees up, accounting for a planned overlap. */
  timeUntilFree(overlapSeconds = 0): number {
    const ctx = this.ctx;
    if (!ctx) return 0;
    const overlap = Math.max(0, Math.min(overlapSeconds, MAX_OVERLAP));
    return Math.max(0, this.busyUntil - overlap - ctx.currentTime);
  }

  /** Wait until this speaker is allowed to start (barge-in aware). */
  async waitForSlot(overlapSeconds = 0): Promise<void> {
    const wait = this.timeUntilFree(overlapSeconds);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait * 1000));
  }

  /**
   * Schedule a prepared clip. Resolves when playback ENDS.
   * Falls back to browser speech synthesis when no buffer decoded.
   */
  async play(clip: PreparedClip, opts: SpeakOptions): Promise<void> {
    this.stopped = false;
    const ctx = this.ensureCtx();
    if (!ctx || !clip.buffer) return this.browserFallback(clip.text, opts);

    const overlap = opts.interruption ? Math.max(0, Math.min(opts.overlapSeconds ?? 1.2, MAX_OVERLAP)) : 0;
    const startAt = Math.max(ctx.currentTime + 0.02, this.busyUntil - overlap);

    const userSpeed = useVoiceStore.getState().speed || 1;
    const rate = Math.max(0.5, Math.min(2, userSpeed * (opts.rate ?? 1)));
    const source = ctx.createBufferSource();
    source.buffer = clip.buffer;
    source.playbackRate.value = rate;
    if (opts.detune && typeof (source as any).detune?.value === 'number') {
      try { source.detune.value = Math.max(-1200, Math.min(1200, opts.detune)); } catch { /* noop */ }
    }

    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, opts.gain ?? 1));


    let tail: AudioNode = gain;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      const seat = typeof opts.seat === 'number' ? opts.seat : 0.5;
      panner.pan.value = Math.max(-0.85, Math.min(0.85, (seat - 0.5) * 1.6));
      gain.connect(panner);
      tail = panner;
    }
    tail.connect(this.master!);
    source.connect(gain);

    // Duck whoever is already speaking when this is a barge-in.
    if (overlap > 0 && this.active.size > 0) {
      for (const entry of this.active.values()) {
        if (!entry?.gain) continue;
        entry.gain.gain.cancelScheduledValues(startAt);
        entry.gain.gain.setTargetAtTime(DUCK_GAIN * entry.base, startAt, 0.12);
      }
    }

    const duration = clip.buffer.duration / rate;
    this.busyUntil = Math.max(this.busyUntil, startAt + duration);

    source.start(startAt);
    this.active.set(opts.speakerId, { gain, source, base: gain.gain.value });
    this.emit();

    await new Promise<void>((resolve) => {
      source.onended = () => {
        try { source.disconnect(); gain.disconnect(); } catch { /* noop */ }
        this.active.delete(opts.speakerId);
        // Restore anyone we ducked.
        for (const entry of this.active.values()) {
          if (!entry?.gain) continue;
          entry.gain.gain.cancelScheduledValues(ctx.currentTime);
          entry.gain.gain.setTargetAtTime(entry.base, ctx.currentTime, 0.15);
        }
        this.emit();
        resolve();
      };
    });
  }

  private browserFallback(text: string, opts: SpeakOptions): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = useVoiceStore.getState().speed || 1;
      this.active.set(opts.speakerId, null as any);
      this.emit();
      const done = () => {
        this.active.delete(opts.speakerId);
        this.emit();
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    });
  }

  stopAll() {
    this.stopped = true;
    for (const entry of this.active.values()) {
      try { entry?.source?.stop(); } catch { /* noop */ }
    }
    this.active.clear();
    this.busyUntil = this.ctx?.currentTime ?? 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    this.emit();
  }

  get isStopped() { return this.stopped; }
}

export const roomMixer = new RoomMixer();

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
