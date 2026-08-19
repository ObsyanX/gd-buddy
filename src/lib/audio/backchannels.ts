// Phase B — backchannel layer.
//
// Short reactions ("mm-hm", "right", "hold on—") are synthesised ONCE per voice
// at session start and cached in memory, so the room can react inside ~300ms
// while the real reply is still being generated. Never generated per turn.

import { roomMixer, type PreparedClip } from '@/lib/audio/room-mixer';

export const BACKCHANNEL_PHRASES = ['Mm-hm.', 'Right.', 'Hold on—', 'Hmm.', 'Sure, but—'] as const;

const cache = new Map<string, PreparedClip[]>();
const inflight = new Map<string, Promise<void>>();

function keyFor(voice: string) {
  return voice || 'default';
}

/** Pre-synthesise the backchannel set for each persona voice. Idempotent. */
export async function primeBackchannels(voices: Array<string | null | undefined>): Promise<void> {
  const unique = [...new Set(voices.filter(Boolean) as string[])];
  await Promise.all(
    unique.map((voice) => {
      const key = keyFor(voice);
      if (cache.has(key)) return Promise.resolve();
      if (inflight.has(key)) return inflight.get(key)!;
      const task = (async () => {
        const clips = await Promise.all(
          BACKCHANNEL_PHRASES.map((phrase) => roomMixer.prepare(phrase, voice)),
        );
        cache.set(key, clips.filter((c) => !!c.buffer));
      })().finally(() => inflight.delete(key));
      inflight.set(key, task);
      return task;
    }),
  );
}

/**
 * Play one cached reaction. Silent no-op when nothing is cached yet, so it
 * never adds latency or an unexpected TTS call.
 */
export async function playBackchannel(opts: {
  voice?: string | null;
  speakerId: string;
  seat?: number;
}): Promise<void> {
  const clips = cache.get(keyFor(opts.voice || ''));
  if (!clips || clips.length === 0) return;
  const clip = clips[Math.floor(Math.random() * clips.length)];
  await roomMixer.play(clip, {
    speakerId: `backchannel:${opts.speakerId}`,
    seat: opts.seat,
    overlapSeconds: 0.8,
    interruption: true,
    gain: 0.55,
  });
}

export function clearBackchannels() {
  cache.clear();
  inflight.clear();
}
