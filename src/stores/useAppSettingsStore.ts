import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CaptionLanguage = 'en-IN' | 'hi-IN' | 'en-US';

interface AppSettingsState {
  autoMicEnabled: boolean;
  setAutoMicEnabled: (enabled: boolean) => void;
  captionLanguage: CaptionLanguage;
  setCaptionLanguage: (lang: string) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      autoMicEnabled: true,
      setAutoMicEnabled: (autoMicEnabled) => set({ autoMicEnabled }),
      captionLanguage: 'en-IN',
      setCaptionLanguage: (lang) =>
        set({ captionLanguage: (['en-IN', 'hi-IN', 'en-US'].includes(lang) ? lang : 'en-IN') as CaptionLanguage }),
    }),
    {
      name: 'appSettings',
      merge: (persisted, current) => {
        if (persisted && typeof persisted === 'object') {
          return { ...current, ...(persisted as Partial<AppSettingsState>) };
        }
        try {
          const old = localStorage.getItem('appSettings');
          if (old) {
            const parsed = JSON.parse(old);
            if (typeof parsed.autoMicEnabled === 'boolean' && !parsed.state) {
              return { ...current, autoMicEnabled: parsed.autoMicEnabled };
            }
          }
        } catch { /* ignore */ }
        return current;
      },
    }
  )
);
