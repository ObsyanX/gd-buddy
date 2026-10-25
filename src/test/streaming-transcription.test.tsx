import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));
vi.mock("@/lib/supabase-auth", () => ({
  invokeWithAuth: async () => ({ data: null, error: new Error("offline") }),
}));

import { useStreamingTranscription } from "@/hooks/useStreamingTranscription";

/** Minimal stand-in for the browser's speech recogniser. */
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = "";
  maxAlternatives = 1;
  starts = 0;
  onstart?: () => void;
  onresult?: (e: unknown) => void;
  onend?: () => void;
  onerror?: (e: unknown) => void;
  constructor() { FakeRecognition.instances.push(this); }
  start() { this.starts++; this.onstart?.(); }
  stop() { this.onend?.(); }
  abort() { this.onend?.(); }
  /** pieces: [text, isFinal][] for the current browser session */
  say(pieces: Array<[string, boolean]>) {
    const results = pieces.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f }));
    this.onresult?.({ results });
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("speech input keeps the whole answer", () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
    (window as any).SpeechRecognition = FakeRecognition;
  });

  it("a pause where the browser ends the session does not close the turn or lose speech", async () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() => useStreamingTranscription({ enableAICorrection: false, onFinalResult: onFinal }));
    act(() => result.current.startListening());
    const rec = FakeRecognition.instances[0];
    act(() => rec.say([["I think tablets help", true]]));
    // Browser ends the session on its own during a 3-second pause.
    await act(async () => { rec.onend?.(); await flush(); });
    expect(result.current.isListening).toBe(true);
    expect(rec.starts).toBe(2);
    expect(onFinal).not.toHaveBeenCalled();
    act(() => rec.say([["when teachers plan", true]]));
    await act(async () => { result.current.stopListening(); rec.onend?.(); await flush(); });
    expect(onFinal).toHaveBeenLastCalledWith("I think tablets help when teachers plan");
  });

  it("keeps a phrase the browser dropped before finalising it, including split pieces", async () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() => useStreamingTranscription({ enableAICorrection: false, onFinalResult: onFinal }));
    act(() => result.current.startListening());
    const rec = FakeRecognition.instances[0];
    act(() => rec.say([["a smart board", false], [" without a plan", false]]));
    await act(async () => { rec.onend?.(); await flush(); });
    act(() => rec.say([["is just a whiteboard", true]]));
    await act(async () => { result.current.stopListening(); rec.onend?.(); await flush(); });
    expect(onFinal).toHaveBeenLastCalledWith("a smart board without a plan is just a whiteboard");
  });

  it("a second start while the mic is already open is ignored", async () => {
    const { result } = renderHook(() => useStreamingTranscription({ enableAICorrection: false }));
    act(() => result.current.startListening());
    act(() => FakeRecognition.instances[0].say([["hello everyone", true]]));
    act(() => result.current.startListening("something else"));
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(result.current.finalText.trim()).toBe("hello everyone");
  });
});
