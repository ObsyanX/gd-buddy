import { describe, it, expect } from "vitest";
import { maskPII, maskObject } from "@/lib/pii";
import { pluginRegistry, type FactCheckPlugin } from "@/lib/plugins/registry";

describe("maskPII", () => {
  it("scrubs common PII types", () => {
    const s = "Contact me at a.b@c.io or +1 415 555 0100. Card 4111 1111 1111 1111.";
    const masked = maskPII(s);
    expect(masked).not.toContain("a.b@c.io");
    expect(masked).toContain("[email]");
    expect(masked).toContain("[card]");
    expect(masked).toContain("[phone]");
  });
  it("walks nested objects", () => {
    const out = maskObject({ user: { email: "x@y.com", notes: ["call 9998887777"] } });
    expect(JSON.stringify(out)).not.toContain("x@y.com");
    expect(JSON.stringify(out)).not.toContain("9998887777");
  });
});

describe("plugin registry", () => {
  it("registers and retrieves by kind+id", () => {
    pluginRegistry.clear();
    const p: FactCheckPlugin = {
      kind: "fact_check",
      id: "test",
      async verify() {
        return { verdict: "unknown", confidence: 0 };
      },
    };
    pluginRegistry.register(p);
    expect(pluginRegistry.get("fact_check", "test")).toBe(p);
    expect(pluginRegistry.byKind("fact_check")).toHaveLength(1);
  });
});
