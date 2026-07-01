import { describe, it, expect, vi, beforeEach } from "vitest";
import { errorMonitor, classifySeverity } from "@/lib/error-monitor";

describe("error-monitor", () => {
  beforeEach(() => {
    // reset internal queue between tests
    (errorMonitor as any).queue = [];
    (errorMonitor as any).recent = new Map();
  });

  it("dedupes identical errors within the window", () => {
    errorMonitor.capture({ error_message: "boom", error_source: "client" });
    errorMonitor.capture({ error_message: "boom", error_source: "client" });
    expect((errorMonitor as any).queue.length).toBe(1);
  });

  it("ignores known-resolved audio noise", () => {
    errorMonitor.capture({ error_message: "Cannot close a closed AudioContext." });
    expect((errorMonitor as any).queue.length).toBe(0);
  });

  it("classifies severity for known patterns", () => {
    expect(classifySeverity("Should have a queue. This is likely a bug in React.")).toBe("critical");
    expect(classifySeverity("Cannot access 'x' before initialization")).toBe("high");
    expect(classifySeverity("Warning: React has detected a change in the order of Hooks")).toBe("high");
    expect(classifySeverity("Failed to fetch")).toBe("medium");
    expect(classifySeverity("random")).toBe("low");
  });

  it("attaches severity metadata on capture", () => {
    errorMonitor.capture({ error_message: "Should have a queue" });
    const entry = (errorMonitor as any).queue[0];
    expect(entry.metadata.severity).toBe("critical");
  });
});
