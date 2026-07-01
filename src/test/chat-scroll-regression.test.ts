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

  it("ScrollArea keeps the scrollbar visible and non-blocking on mobile", () => {
    const src = read("src/components/ui/scroll-area.tsx");
    // Scrollbar is force-mounted so it renders on mobile too (ChatGPT-style visible bar)
    expect(src).toMatch(/ScrollBar\s+forceMount/);
    // The scrollbar container must not receive touch pointers on mobile — that would
    // swallow swipes over the right edge before they reach the Radix viewport.
    expect(src).toMatch(/pointer-events-none\s+lg:pointer-events-auto/);
  });

  it("Discussion rooms lock page scrolling and reserve scroll for the chat viewport", () => {
    const layout = read("src/layouts/AppLayout.tsx");
    const transition = read("src/components/PageTransition.tsx");
    const room = read("src/components/DiscussionRoom.tsx");
    const bottomNav = read("src/components/BottomNav.tsx");

    expect(layout).toMatch(/isDiscussionSession[\s\S]*h-dvh overflow-hidden/);
    expect(layout).toMatch(/discussion-scroll-lock/);
    expect(layout).toMatch(/isDiscussionSession[\s\S]*min-h-0 overflow-hidden/);
    expect(transition).toMatch(/isDiscussionSession[\s\S]*h-full min-h-0 overflow-hidden/);
    expect(room).toMatch(/h-full min-h-0[^"]*overflow-hidden/);
    expect(room).toMatch(/hidden sm:block lg:hidden shrink-0/);
    expect(room).toMatch(/useOnboardingTutorial\(\{ autoOpen: false \}\)/);
    expect(room).toMatch(/min-h-0[^"]*overflow-hidden/);
    expect(bottomNav).toMatch(/!isDiscussionSession/);
  });

  it("Global CSS enables pan-y touch on Radix viewports at mobile/tablet widths", () => {
    const css = read("src/index.css");
    expect(css).toMatch(
      /\[data-radix-scroll-area-viewport\][^}]*touch-action:\s*pan-y/,
    );
  });
});
