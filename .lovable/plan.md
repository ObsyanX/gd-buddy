## Design Direction — locked

- **Palette (Burnt Sienna, no blue/purple):**
  - `--background` deep ceramic `#0F0906` (HSL 18 40% 4%)
  - `--surface` warm charcoal `#1A0F0A`
  - `--primary` copper `#CD7F32` (HSL 29 60% 50%)
  - `--primary-glow` amber `#E8C07A`
  - `--secondary` burnt sienna `#A0522D`
  - `--accent` sienna deep `#6B3A2A`
  - `--foreground` warm ivory `#F5EEE4`, muted `#B8A99A`
- **Typography:** `Cormorant Garamond` (display, italic accents) + `Karla` (body/UI) + `JetBrains Mono` (meta/labels). Loaded via `@fontsource/*`.
- **Signature language:** Frosted glass panels (`backdrop-blur-2xl` + copper hairline border + soft inner amber glow), ambient breathing gradient orbs, split cinematic hero + live-preview panel, bento grid for features, editorial italic headline emphasis.
- **Motion:** Framer-motion — headline word-stagger reveal, parallax rise on glass cards, copper underline draw on links, "breathing" ambient orbs, hover tilt on bento cards, animated waveform bars in room previews, page transitions via `PageTransition`.

## Technical scaffolding

1. **Fonts** — `bun add @fontsource/cormorant-garamond @fontsource/karla @fontsource/jetbrains-mono`; import in `src/main.tsx`; register `font-display` / `font-sans` / `font-mono` in `tailwind.config.ts`. Remove existing Google Fonts `@import` lines from `src/index.css`.
2. **Design tokens** — Rewrite `:root` and `.dark` blocks in `src/index.css` with new HSL values above; add utilities: `.glass`, `.glass-strong`, `.copper-glow`, `.grain-overlay`, `.ambient-orb`, `.headline-italic`, gradient tokens `--gradient-copper`, `--gradient-ember`, `--shadow-premium`.
3. **Global background** — Add fixed ambient orb layer + subtle grain texture in `App.tsx` root (behind `Outlet`).
4. **Tailwind config** — add `fontFamily.display / sans / mono`, radius bump (`--radius: 1.25rem`), and new keyframes: `orb-breathe`, `word-rise`, `underline-draw`, `tilt-hover`.

## Component redesign (end-to-end)

Refactored in this order — each keeps its existing props/logic, only presentation changes:

- **Shared primitives** (`src/components/ui/*`)
  - `button.tsx` — new variants: `premium` (copper fill), `glass` (frosted), `ghost-copper`. 44px min tap.
  - `card.tsx` — becomes glass by default (`glass` class); add `<GlassCard>` wrapper.
  - `input.tsx`, `textarea.tsx`, `select.tsx`, `dialog.tsx`, `sheet.tsx`, `tabs.tsx`, `badge.tsx`, `tooltip.tsx`, `dropdown-menu.tsx` — restyle with glass surface + copper focus rings.
- **Chrome**
  - `NavLink.tsx`, top nav on `Home.tsx` layout — integrated frosted bar with copper active underline draw.
  - `PageTransition.tsx` — fade+rise via framer-motion.
  - `SEOFooter.tsx` — editorial three-column footer, italic Cormorant headings.
- **Landing** (`src/pages/Landing.tsx`) — full rebuild using the selected direction:
  - Cinematic hero (split): left editorial headline "Speak. *Lead.* Conquer." with italic accent + copper→amber gradient last word; ambient orbs; live-practice status pill (JetBrains Mono).
  - Right: live glass "Session Preview" panel with animated waveform + speech-quality bar.
  - Bento grid (6 tiles, mixed sizes) below hero: AI Moderator, Live Rooms, Analytics Radar, Coaching Overlay, Knowledge Graph, Achievements.
  - Testimonial band (glass) + stats strip + editorial CTA.
- **Auth** (`Auth.tsx`, `ResetPassword.tsx`) — centered glass card, copper CTA, ambient orbs.
- **Home / Dashboard** (`Home.tsx`, `Dashboard.tsx`) — bento layout: streak, upcoming rooms, latest report, radar snapshot, achievements, notifications; all glass tiles with hover-tilt.
- **Practice flow** (`Practice.tsx`, `PracticeSetup.tsx`, `TopicSelection.tsx`, `SessionSetup.tsx`, `StartGD.tsx`, `Session.tsx`) — stepper with copper progress; frosted topic cards.
- **Discussion Room** (`DiscussionRoom.tsx`, `FloatingVideoPanel.tsx`, `VideoMonitor.tsx`, `ParticipantPresence.tsx`, `TurnQueueBadge.tsx`, `VoiceActivityIndicator.tsx`, `AudioWaveform.tsx`, `VoiceMetricsPanel.tsx`, `WPMDisplay.tsx`, `LiveCoachingOverlay.tsx`, `VideoCoachingOverlay.tsx`, `DiscussionHealthMeter.tsx`) — glass panels, copper waveform, amber "speaking" glow ring, mono session-id chip. Mobile-first preserved.
- **Reports** (`SessionReport.tsx`, `SessionReportPage.tsx`, `PerTurnAnalysis.tsx`, `PerformanceInsights.tsx`, `SessionHistoryComparison.tsx`, `FeedbackHistory.tsx`, `SessionReplay.tsx`, `SessionNotes.tsx`) — editorial layout, radar chart in copper/amber, italic section headers.
- **Multiplayer** (`Multiplayer.tsx`, `MultiplayerSetup.tsx`, `MultiplayerTopic.tsx`, `MultiplayerLobby.tsx`, `JoinCohort.tsx`) — lobby glass tiles with animated presence avatars.
- **Profile / Settings** (`Profile.tsx`, `Settings.tsx`, `AccessibilityCenter.tsx`) — sectioned glass panels; a11y toggles with copper switches.
- **Admin & Governance** (`Admin.tsx`, `Governance.tsx`, `InstructorDashboard.tsx`, `Intelligence.tsx`, `ADRs.tsx`) — dense editorial dashboard: glass stat tiles, copper divider rules, mono metrics, tabs restyled. Keep all data queries untouched.
- **Content pages** (`About.tsx`, `GDPreparationGuide.tsx`, `HowToCrackGD.tsx`, `CommonGDMistakes.tsx`, `BodyLanguageTips.tsx`, `CommunicationSkills.tsx`, `SpeakConfidently.tsx`, `ConcludeGD.tsx`, `GDTopics.tsx`, `GDTopicPage.tsx`, `AIGDSimulator.tsx`, `SkillDrills.tsx`) — magazine-style Cormorant italic headlines, drop-cap first paragraph, copper hairline rules.
- **Utility widgets** (`Leaderboard.tsx`, `PracticeStreakWidget.tsx`, `SkillProgressWidget.tsx`, `PracticeHistory.tsx`, `NotificationBell.tsx`, `OfflineBanner.tsx`, `OnboardingTutorial.tsx`, `SkeletonLoaders.tsx`, `ErrorBoundary.tsx`, `DrillHistory.tsx`, `CustomPersonaForm.tsx`, `CreateDrillModal.tsx`) — glass surfaces, copper accents, redesigned skeletons.
- **NotFound / Health** — editorial full-bleed error state.

## Motion system

`src/lib/motion.ts` — exports `fadeRise`, `wordStagger`, `orbBreathe`, `tiltHover`, `underlineDraw` variants. Reused across pages. Respects `prefers-reduced-motion` via `useAccessibility`.

## Guardrails

- No business logic, routing, RLS, or data changes — presentation only.
- All colors via HSL tokens; no hardcoded `text-white` / `bg-black` / arbitrary hex in components.
- Contrast AA verified on copper-on-ceramic pairings.
- Mobile-first preserved; existing responsive rules kept.
- Keep icon-only Buttons with `aria-label`, single `<main>` per route.

## Deliverable order

1. Tokens + fonts + tailwind config + global background/grain.
2. UI primitives (button/card/input/dialog/tabs/badge/tooltip).
3. Landing + Auth (highest visual impact).
4. Home/Dashboard + Discussion Room.
5. Reports + Multiplayer + Profile/Settings.
6. Admin/Governance/Intelligence + content pages.
7. Widgets, skeletons, error/404, polish pass + Playwright screenshot verification of 8 key routes.

No functional regressions; existing E2E/unit tests remain green.
