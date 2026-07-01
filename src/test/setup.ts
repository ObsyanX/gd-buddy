import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Minimal AudioContext mock for hook/audio tests
class MockAudioContext {
  state: AudioContextState = "running";
  createAnalyser() {
    return {
      fftSize: 0,
      frequencyBinCount: 128,
      getByteFrequencyData: (_arr: Uint8Array) => {},
      disconnect: () => {},
      connect: () => {},
    } as any;
  }
  createMediaStreamSource() {
    return { connect: () => {}, disconnect: () => {} } as any;
  }
  async close() {
    if (this.state === "closed") throw new Error("Cannot close a closed AudioContext.");
    this.state = "closed";
  }
}
(globalThis as any).AudioContext = MockAudioContext;

// requestAnimationFrame shim
if (!globalThis.requestAnimationFrame) {
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as any;
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Silence Supabase network in tests
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({ insert: async () => ({ error: null }) }),
  },
}));
