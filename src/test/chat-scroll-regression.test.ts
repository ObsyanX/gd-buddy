import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Mobile touch-scroll regression guard for the Discussion Room chat.
 *
 * Static checks (no browser required) that catch the classes of bugs that
 * broke swipe scrolling on iOS Safari / Chrome / Android in the past:
 *
 *   1. MessageList must render chat messages inside a Radix `ScrollArea`
 *      so the correct `[data-radix-scroll-area-viewport]` element receives
 *      touches (never a plain `overflow-auto` div that iOS treats differently).
 *   2. The `ScrollArea` container must include `min-h-0` inside a flex-col
 *      parent, otherwise `flex-1` never shrinks and the viewport has no
 *      overflow to scroll on small screens.
 *   3. Auto-scroll on new messages must NOT use `scrollIntoView` (which
 *      bubbles up and scrolls the document/window) — only `viewport.scrollTop`
 *      is allowed.
 *   4. The shared `ScrollArea` primitive must expose `touch-action: pan-y`
 *      and `-webkit-overflow-scrolling: touch` on the viewport, and must
 *      NOT render a `touch-none` scrollbar overlay on mobile
 *      (would swallow swipes over the right edge of the chat).
 */

const read = (rel: string) =>
  fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("Chat touch-scroll regression guard", () => {
  it("MessageList renders inside Radix ScrollArea with min-h-0", () => {
    const src = read("src/components/discussion/MessageList.tsx");
    expect(src).toMatch(/from ["']@\/components\/ui\/scroll-area["']/);
    expect(src).toMatch(/<ScrollArea\b[^>]*\bmin-h-0\b/);
  });

  it("MessageList never calls scrollIntoView (would scroll the document)", () => {
    const src = read("src/components/discussion/MessageList.tsx");
    expect(src).not.toMatch(/scrollIntoView\s*\(/);
    // Must scroll the viewport itself, scoped to the chat.
    expect(src).toMatch(/data-radix-scroll-area-viewport/);
    expect(src).toMatch(/scrollTop\s*=\s*[^;]*scrollHeight/);
  });

  it("ScrollArea viewport enables native touch scrolling", () => {
    const src = read("src/components/ui/scroll-area.tsx");
    expect(src).toMatch(/touch-action:pan-y/);
    expect(src).toMatch(/-webkit-overflow-scrolling:touch/);
  });

  it("ScrollArea does not force-mount a touch-swallowing scrollbar on mobile", () => {
    const src = read("src/components/ui/scroll-area.tsx");
    // forceMount would keep the `touch-none` scrollbar overlay alive on mobile.
    expect(src).not.toMatch(/ScrollBar\s+forceMount/);
    // Scrollbar must be hidden and pointer-events disabled below the lg breakpoint.
    expect(src).toMatch(/max-lg:hidden/);
    expect(src).toMatch(/max-lg:pointer-events-none/);
  });

  it("Global CSS enables pan-y touch on Radix viewports at mobile/tablet widths", () => {
    const css = read("src/index.css");
    expect(css).toMatch(
      /\[data-radix-scroll-area-viewport\][^}]*touch-action:\s*pan-y/,
    );
  });
});
