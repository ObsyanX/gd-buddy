import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VoiceState {
  voice: string;
  speed: number;
  setVoice: (voice: string) => void;
  setSpeed: (speed: number) => void;
}

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      voice: 'sarah',
      speed: 1.0,
      setVoice: (voice) => set({ voice }),
      setSpeed: (speed) => set({ speed }),
    }),
    {
      name: 'voiceSettings',
      // Migrate from old localStorage format
      merge: (persisted, current) => {
        if (persisted && typeof persisted === 'object') {
          return { ...current, ...(persisted as Partial<VoiceState>) };
        }
        // Try to read old format
        try {
          const old = localStorage.getItem('voiceSettings');
          if (old) {
            const parsed = JSON.parse(old);
            if (parsed.voice && !parsed.state) {
              // Old format detected, migrate
              return { ...current, voice: parsed.voice, speed: parsed.speed ?? 1.0 };
            }
          }
        } catch { /* ignore */ }
        return current;
      },
    }
  )
);
