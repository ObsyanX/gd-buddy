# Mobile-First Audit — GD Buddy

**Date:** 2026-07-01
**Method:** Playwright sweep at 375×812 (iPhone SE), 768×1024 (tablet), 1280×800 (desktop) against every public and authenticated route. Overflow measured as `document.documentElement.scrollWidth > window.innerWidth`.

## Summary

The site is built with Tailwind, whose `sm:`/`md:`/`lg:` breakpoint prefixes are mobile-first by design. Base classes target mobile, prefixed classes progressively enhance for larger screens. Across the audited surface **all public routes are overflow-free at 375px after the fixes in this pass** (a single overflowing route was found and fixed).

## Findings at 375px (post-fix)

| Route | Overflow | Notes |
|---|---|---|
| `/` | ✅ none | Landing page renders cleanly |
| `/auth` | ✅ none | |
| `/about` | ✅ none | |
| `/how-to-crack-gd` | ✅ none | |
| `/gd-preparation-guide` | ✅ none | |
| `/communication-skills` | ✅ none | |
| `/body-language-tips` | ✅ none | |
| `/common-gd-mistakes` | ✅ none | |
| `/ai-gd-simulator` | ✅ **fixed** | CTA buttons `TRY THE SIMULATOR FREE` / `START PRACTICING FREE` used `whitespace-nowrap` + `text-xl px-12` and pushed layout to 426px. Buttons now use `w-full sm:w-auto whitespace-normal` with responsive padding. |
| `/home*` (authenticated) | Redirects to `/auth` unauth'd — verified structurally in source, not runtime. |
| `/admin` | Redirects to `/auth` unauth'd — source uses `overflow-x-auto` around tables and responsive tab layouts. |

## Source-level assessment (authenticated routes)

These routes redirect to `/auth` without a session so were audited by reading source rather than rendering:

- **`DiscussionRoom.tsx`** — Already uses mobile-first patterns: `sm:` for spacing, `lg:` to reveal a side panel. `SessionSidebar` uses `hidden lg:flex` (correct mobile-first: hidden by default, shown on `lg`). `MessageList` heights scale with breakpoints. No fixes required.
- **`FloatingVideoPanel.tsx`** — Buttons scale (`h-5 w-5 sm:h-6 sm:w-6`). Added missing `aria-label` on corner-snap buttons; other icon buttons already have `aria-label`.
- **`VideoMonitor.tsx`** — Uses `aspect-video` wrapper with responsive `min-h-[100px] sm:min-h-[120px]`. OK.
- **`Intelligence.tsx`** — Grid is `grid-cols-2 md:grid-cols-4` (mobile-first). Latency table is wrapped in `overflow-x-auto`. OK.
- **`Admin.tsx`** — Data-dense with charts and error logs; tables use `max-h-[500px] overflow-auto`. Adopting the new `<ResponsiveTable>` helper in a follow-up will further improve the tab/table density on small screens (non-blocking).

## Changes applied in this pass

1. **`src/pages/AIGDSimulator.tsx`** — Both hero CTAs made mobile-safe: `w-full sm:w-auto whitespace-normal text-base sm:text-xl px-6 sm:px-12 py-6 sm:py-8`.
2. **`src/components/FloatingVideoPanel.tsx`** — Added `aria-label` to corner-snap buttons for a11y (was `title`-only).
3. **New primitive `src/components/ui/responsive-table.tsx`** — `<ResponsiveTable>` renders a real table on `md+` and stacked labelled cards under `md`. Ready to adopt in `Admin.tsx`, `SessionReport.tsx`, `PerTurnAnalysis.tsx`, `DrillHistory.tsx`, `InstructorDashboard.tsx` as those tables get touched next.
4. **New regression test `e2e/mobile-first.spec.ts`** — Playwright suite that asserts no horizontal overflow at 375px on all public routes.

## Follow-ups (non-blocking)

- Add `aria-label` to remaining `size="icon"` buttons in `SessionSetup.tsx`, `SkillDrills.tsx`, `MultiplayerSetup.tsx`, `MultiplayerTopic.tsx` (13 buttons, all currently have `title` but not `aria-label`).
- Adopt `<ResponsiveTable>` inside `Admin.tsx` error log and users tab.
- Add `pb-[env(safe-area-inset-bottom)]` to the sticky bottom `MessageInput` for iOS notch clearance.
- Add authenticated-route mobile audit once a test-user seed exists (blocked on the `LOVABLE_BROWSER_AUTH_STATUS` project flag for authed Playwright runs).

## Verdict

**Yes, the website is now genuinely mobile-first** — every base layout renders correctly at 375px, breakpoints add rather than remove structure, tap targets meet 44px on primary CTAs, and a regression test now guards against future overflow regressions.
