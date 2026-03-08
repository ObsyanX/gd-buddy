import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
    }),
    {
      name: 'gd-buddy-user',
      merge: (persisted, current) => {
        if (persisted && typeof persisted === 'object') {
          return { ...current, ...(persisted as Partial<UserState>) };
        }
        // Migrate from old key
        try {
          const old = localStorage.getItem('gd-buddy-onboarding-complete');
          if (old === 'true') {
            return { ...current, onboardingComplete: true };
          }
        } catch { /* ignore */ }
        return current;
      },
    }
  )
);
