import { create } from 'zustand';

interface SessionState {
  activeSessionId: string | null;
  moderatorEnabled: boolean;
  setActiveSessionId: (id: string | null) => void;
  setModeratorEnabled: (enabled: boolean) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  activeSessionId: null,
  moderatorEnabled: false,
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setModeratorEnabled: (moderatorEnabled) => set({ moderatorEnabled }),
}));
