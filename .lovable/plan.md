## Mobile-First Audit & Fix — Full Website

### Goal
Bring every route and component to a true mobile-first standard: base styles target 375px, breakpoints (`sm:`/`md:`/`lg:`) progressively enhance for larger screens. No horizontal scroll, no clipped controls, all tap targets ≥ 44px, all data-dense views usable on phones.

### Phase 1 — Audit (evidence, not guesses)
Run Playwright at three viewports (375×812, 768×1024, 1280×800) across every route, capture screenshots + console warnings, and produce a per-page issue list.

Routes to sweep:
- Public: `/`, `/auth`, `/about`, SEO pages (`/how-to-crack-gd`, `/gd-preparation-guide`, `/communication-skills`, `/body-language-tips`, `/common-gd-mistakes`, `/ai-gd-simulator`, `/gd-topics/:slug`)
- Authenticated: `/home`, `/home/dashboard`, `/home/profile`, `/home/settings`, `/home/skill-drills`, `/home/multiplayer-setup`, `/home/session/:id` (DiscussionRoom), `/home/report/:id`, `/home/intelligence`, `/home/instructor`, `/admin`, `/health`

Audit output: `docs/mobile-audit.md` + `/tmp/mobile-audit/screens/` (kept out of repo).

### Phase 2 — Fix weak-spot screens (mobile-first refactor)
Priority order based on the earlier scan:

1. **DiscussionRoom** (`src/components/DiscussionRoom.tsx`, `discussion/SessionHeader.tsx`, `discussion/MessageList.tsx`, `discussion/MessageInput.tsx`)
   - Stack video/transcript/controls vertically on mobile; grid only from `md:`.
   - Collapse SessionHeader into a compact bar with a sheet for meta/policies.
   - MessageInput: full-width, sticky bottom, safe-area-inset padding.

2. **Video surfaces** (`FloatingVideoPanel.tsx`, `VideoMonitor.tsx`, `AudioWaveform.tsx`)
   - Replace desktop-first `lg:hidden` carve-outs with mobile-base layout.
   - PiP tile becomes a bottom-sheet drawer < `md`.

3. **Intelligence dashboard** (`src/pages/Intelligence.tsx`)
   - Convert multi-column KPI grid to single column base → `md:grid-cols-2` → `lg:grid-cols-3`.
   - Radar chart in `aspect-square` wrapper; tables become card lists on `< md`.

4. **Admin** (`src/pages/Admin.tsx`)
   - Tabs scroll horizontally; tables → responsive card view under `md`.
   - Charts use `ResponsiveContainer` with min-height guards.
   - Error log severity filters wrap onto two rows on mobile.

5. **Reports & analytics** (`SessionReport.tsx`, `PerTurnAnalysis.tsx`, `DrillHistory.tsx`, `InstructorDashboard.tsx`)
   - Convert side-by-side metric panels to stacked cards on mobile.
   - Long tables → shadcn `Accordion`/card fallback via a shared `<ResponsiveTable>` helper (new util in `src/components/ui/responsive-table.tsx`).

6. **Feature pages with sparse responsive classes** (`CommonGDMistakes`, `BodyLanguageTips`, `MultiplayerSetup`, `CommunicationSkills`, `GDTopicPage`, `CustomPersonaForm`, `SessionSetup`, `FeedbackForm`)
   - Verify base widths, remove any fixed `w-[Npx]`, apply `max-w-*` with `w-full` fallback, tighten typography scale.

7. **Layout shell** (`src/layouts/AppLayout.tsx`, `SEOFooter.tsx`, sidebar)
   - Confirm the sidebar collapses to sheet on mobile (already using `ui/sheet.tsx`), audit for hidden overflow issues.
   - Ensure a single `<main>` per route (a11y rule).

### Phase 3 — Cross-cutting rules to enforce
- **Tap targets:** every icon-only `Button` gets `min-h-11 min-w-11` and `aria-label`.
- **Typography:** use existing token scale (`text-h1`, `text-body`, …); no fixed `text-[Npx]`.
- **Containers:** replace ad-hoc `max-w-*` with the Tailwind `container` where appropriate; `px-4 md:px-6 lg:px-8`.
- **Overflow:** wrap tables/wide charts in `overflow-x-auto` with `-mx-4 md:mx-0`.
- **Safe area:** apply `pb-[env(safe-area-inset-bottom)]` on sticky bottom bars.
- **Images:** use `aspect-*` wrappers instead of manual sizing.

No color-token or design-language changes — visual identity stays as defined in memory (dark theme, Apple-like minimal).

### Phase 4 — Verification
- Re-run the Playwright sweep; diff before/after screenshots for the fixed routes.
- Add a lightweight regression test `e2e/mobile-first.spec.ts` that asserts no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`) on the priority routes at 375px.
- Run existing `bun run ci` to confirm nothing else regressed.

### Deliverables
- `docs/mobile-audit.md` — findings per route with screenshots
- Refactored components/pages listed in Phase 2
- New `src/components/ui/responsive-table.tsx` helper
- `e2e/mobile-first.spec.ts` regression test
- No changes to backend, RLS, edge functions, or business logic

### Out of scope
- Redesign of any screen (only responsive/layout changes)
- New features, new pages, new theming
- Native-app packaging or PWA install prompts