
# GD Buddy — Frontend Architecture & Design Blueprint

A world-class redesign blueprint executed as a **blueprint-first, phased-implementation** effort. No code changes ship until the blueprint below is approved. Existing routing, auth, RLS, edge functions, and business logic are preserved throughout.

---

## 1. UI/UX Audit (current state)

Scoring scale 1–10. Findings are consolidated from prior audits (mobile-first pass, glassmorphism redesign, PWA nav overhaul) plus current `/home`, `Auth`, `Dashboard`, `DiscussionRoom`, `Intelligence`, `Admin`, `Profile`, `Settings`.

| Surface | Strengths | Weaknesses / Issues | UI | UX | A11y | Perf | Motion | Resp. | Overall |
|---|---|---|---|---|---|---|---|---|---|
| Landing (`/`) | Sienna glass identity, Cormorant display type | Hero orbs cause paint cost on low-end mobiles; CTA hierarchy competes with nav; no reduced-motion path | 7 | 7 | 6 | 6 | 7 | 7 | 6.8 |
| Navbar / AppLayout | Floating bottom nav, PWA install, snap chip strip removed | Header logo lacks fluid srcset breakpoints on iOS Safari; sheen animation triggers layout on some devices | 7 | 7 | 6 | 7 | 6 | 7 | 6.7 |
| Auth pages | Clean glass card, Google OAuth | Inputs lack live validation, focus ring inconsistent, no error region `aria-live` | 6 | 6 | 5 | 8 | 5 | 7 | 6.1 |
| Dashboard | Good info density, radar/health widgets | Card rhythm inconsistent, no skeleton pattern, no empty-state art | 6 | 6 | 6 | 6 | 5 | 6 | 5.8 |
| Discussion Room | Feature-complete (voice/vision/turns) | UI density on mobile, participant tiles clip, transcript scroll competes with keyboard, no reduced-motion for "speaking" pulse | 6 | 6 | 5 | 5 | 6 | 5 | 5.5 |
| AI Chat / Intelligence | Rich data | Chart legend crowding, tooltip contrast weak, no keyboard focus on chart points | 6 | 6 | 5 | 6 | 5 | 6 | 5.6 |
| Report Card | Comprehensive metrics | Print/PDF layout differs from screen; share dialog lacks focus trap review | 6 | 6 | 6 | 7 | 5 | 6 | 6.0 |
| Profile / Settings | Functional | No section landmarks, no autosave feedback, XP widget lacks motion payoff | 6 | 6 | 6 | 8 | 5 | 7 | 6.3 |
| Admin | Data-accurate now | Table lacks column freezing, filters not persisted, virtualization missing | 6 | 6 | 6 | 6 | 4 | 6 | 5.7 |
| Footer / Empty / Loading / Error | Exists | Empty states are text-only; loading uses spinners not skeletons; 404/500 lack character | 5 | 5 | 6 | 7 | 4 | 6 | 5.4 |
| Mobile experience overall | Bottom nav, PWA | Safe-area insets missing in a few modals; 100vh not `dvh` in 3 places | 6 | 6 | 6 | 6 | 6 | 7 | 6.2 |

**Aggregate: UI 6.2 · UX 6.2 · A11y 5.7 · Perf 6.5 · Motion 5.3 · Resp 6.4 · Professionalism 6.4 · Modern 6.5 · Product Quality 6.1**

Cross-cutting issues:
- Semantic tokens exist but a few components still use raw Tailwind colors.
- Motion is decorative rather than communicative (no shared spring language).
- No formal state matrix per component (default / hover / active / focus / disabled / loading / error / empty / success).
- Icons vary in stroke weight; typography scale has gaps at fluid mid-sizes.

---

## 2. Benchmark synthesis

Targets to internalize (never clone):

- **Linear / Raycast** — command density, keyboard-first, 150–200ms micro-interactions, subtle stagger.
- **Stripe / Vercel** — mesh gradients, hairline borders, precise 8pt rhythm, restrained motion.
- **Framer / Apple** — spatial depth via layered translucency, hero focal points, spring physics.
- **Notion / Figma** — content-first layouts, quiet chrome, strong empty states.
- **Perplexity / OpenAI / Cursor** — AI affordances (streaming cursors, "thinking" shimmer, source pills).
- **Arc / Supabase / GitHub** — sidebar orchestration, tabbed density, elevated status semantics.

Translation for GD Buddy: keep the **Burnt Sienna / Copper editorial** identity, borrow the *interaction rigor* (spring tokens, focus rings, keyboard model), *not* the palettes.

---

## 3. Design System (tokens)

All tokens land in `src/index.css` and `tailwind.config.ts` as HSL semantic variables (light + dark). No raw hexes in components.

- **Color roles**: `background`, `foreground`, `surface/1..4`, `primary` (sienna), `primary-glow` (copper), `accent-amber`, `accent-clay`, `muted`, `border`, `ring`, `success`, `warning`, `destructive`, `info`, plus `state-*` overlays.
- **Type scale (fluid `clamp`)**: display-2xl → xs (10 steps), pairing `Cormorant Garamond` (display) + `Inter` (UI) + `JetBrains Mono` (data).
- **Space scale**: 2/4/6/8/12/16/20/24/32/40/56/72/96 (8pt with 2/6 refinements).
- **Radius**: `sm 6 · md 10 · lg 14 · xl 20 · 2xl 28 · pill 999`.
- **Elevation**: e0..e5 with paired outer + inset copper-tinted rims.
- **Glass**: `glass/1..3` (blur 8/16/24, sat 140%, 1px inner-highlight border).
- **Motion tokens**: durations `100/150/200/300/450/700ms`; easings `standard`, `emphasized`, `entrance`, `exit`, `spring-soft (280, 24)`, `spring-snap (400, 30)`.
- **Focus**: 2px `ring` + 2px offset, sienna at 60% alpha, respects `:focus-visible`.
- **Breakpoints**: `xs 380 · sm 480 · md 768 · lg 1024 · xl 1280 · 2xl 1536 · uw 1920`.
- **Container widths**: `prose 68ch · app 1440 · wide 1600 · ultra 1840`.
- **Icon sizes**: 14/16/18/20/24, stroke 1.5.
- **State matrix** applied to every component: default, hover, active, focus-visible, disabled, loading, error, empty, success, selected, dragging.

---

## 4. Motion System

- **Principle**: motion communicates *hierarchy, causality, and status* — never decoration.
- **Choreography**: parent enters, children stagger 40ms, exit reverses at 0.8× duration.
- **Spring registry** (Framer Motion): `soft`, `snap`, `bouncy`, `precise`, `hover`, `press`.
- **Reduced motion**: hard switch to opacity-only transitions ≤120ms; disable orbs, parallax, sheen.
- **Scroll**: Lenis with damped 1.05; ScrollTrigger for landing sections; disabled on Discussion Room.
- **Interaction feedback**: every actionable element has hover + press + focus + success/failure states.
- **AI affordances**: streaming cursor, shimmer "thinking", source-pill pop-in, novelty ✨ badge micro-scale.
- **Data-viz**: charts animate on enter only; hover uses tooltip fade 120ms; no re-anim on filter changes to avoid nausea.

---

## 5. Component Architecture (Atomic)

- **Atoms**: Button (7 variants × 4 sizes), Input, Textarea, Select, Checkbox, Radio, Switch, Badge, Chip, Tag, Avatar, Icon, Kbd, Divider, Skeleton, Spinner, ProgressBar, ProgressRing.
- **Molecules**: FormField, SearchBox, StatCard, MetricPill, ToastItem, TooltipContent, MenuItem, TabItem, BreadcrumbItem, EmptyState, ErrorState, LoadingState.
- **Organisms**: AppHeader, BottomNav, Sidebar, DataTable (virtualized), ChartFrame, DialogShell, CommandPalette, ParticipantTile, TranscriptFeed, FeedbackForm, ReportSection, AchievementCard.
- **Templates**: PublicShell, AppShell, RoomShell, ReportShell, AuthShell, AdminShell.
- Each component ships with: `variants`, `states`, `a11y`, `responsive rules`, `motion spec`, `stories/examples`, `tests`.

---

## 6. Responsive Strategy

- Mobile-first with `dvh` / `svh` / `lvh` where relevant; safe-area insets on all overlays.
- Layout modes: `stack` (xs–sm), `split` (md), `three-pane` (lg+), `wide-canvas` (uw).
- Discussion Room reflows: tile grid → carousel on ≤sm; transcript becomes bottom-sheet.
- Foldable: CSS `screen-spanning` fallback to `split`.
- Ultrawide: cap content at `wide`, use ambient side rails, not stretched cards.

---

## 7. Accessibility Plan

- WCAG 2.2 AA; contrast ≥ 4.5:1 (7:1 for critical); focus-visible everywhere.
- Single `<main>` per route; semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`).
- Full keyboard model with a documented shortcut map; Command Palette (`⌘K`).
- `aria-live` for toasts, transcript updates, timer warnings.
- Radix/shadcn primitives for dialogs, menus, tooltips (no bespoke traps).
- `prefers-reduced-motion` + in-app "Reduce motion" toggle synced to a store.
- Screen-reader script pass on Discussion Room, Report Card, Admin.

---

## 8. Performance Plan

- Route-level `React.lazy` + `Suspense` skeletons; preloading on hover for primary links.
- Image pipeline: AVIF/WebP with `srcset` + `sizes`; logo already using srcset — extend everywhere.
- Bundle: analyze with `rollup-plugin-visualizer`; split Framer Motion, charts, R3F/Spline.
- Memoize hot lists (transcript, participants) via `useMemo` + `react-window` for virtualization.
- Animate only `transform` / `opacity`; `will-change` on entry, cleared on exit.
- Debounce realtime state updates; batch supabase channel handlers.
- Budget: TTI < 2.5s on 4G mid-tier, INP < 200ms, CLS < 0.05, 60fps on scroll & room.

---

## 9. Interaction Specification (excerpt)

- **Button**: hover copper glow (opacity 0→0.35, 150ms), press scale 0.98 snap, focus ring, success ✓ morph 200ms.
- **Card**: hover lift Y-2 + shadow e2→e3, border-highlight fade-in.
- **Input**: focus expand ring, floating label 120ms, error shake 6px once + `aria-live`.
- **Nav**: active pill morph via `layoutId`; hover reveals label chip.
- **Chart**: enter draw-in 700ms emphasized; hover crosshair 120ms.
- **AI Thinking**: shimmer bar + 3-dot bounce (spring-soft) with SR "AI is responding".
- **Mic activation**: ring pulse tied to VAD amplitude (throttled 30fps).
- **Achievement unlock**: confetti-lite (particles, respects reduced-motion) + XP counter tween.
- **Report Generation**: skeleton → section-by-section reveal stagger 60ms.

---

## 10. Visual Polish

- Layered ambient: mesh gradient base + subtle noise (2%) + copper aurora on hero only.
- Hairline borders (1px `border` at 12–18% alpha) for editorial calm.
- Depth via translucency stacks, not heavy shadows.
- Section transitions with soft masks, no hard cuts.
- Iconography unified at Lucide 1.5 stroke; custom SVGs where domain-specific (radar, health meter).
- Print styles for Report Card (A4, black-on-cream, no glass).

---

## 11. Implementation Roadmap (phased; each phase gated by review)

```text
P1  Design Tokens & Theme        (index.css, tailwind.config.ts)          low risk
P2  Layout Architecture          (AppLayout, shells, safe-area, dvh)      low
P3  Navigation & Command         (Header, BottomNav, ⌘K palette)          med
P4  Landing Page                 (Hero, sections, motion, reduced-motion) med
P5  Auth Pages                   (validation, a11y, error live regions)   low
P6  Dashboard                    (grid, skeletons, empty states)          med
P7  Discussion Room              (tiles, transcript, mobile bottom-sheet) high
P8  AI Chat / Intelligence       (charts, tooltips, keyboard)             med
P9  Report Card + Print          (screen + PDF parity)                    med
P10 Profile / Settings / Admin   (autosave, virtualized tables)           med
P11 Motion System rollout        (spring tokens, choreography, Lenis)     med
P12 Performance pass             (bundle split, virtualization, budgets)  med
P13 Accessibility pass           (audit, SR script, reduced-motion)       low
P14 Final polish & QA            (visual QA, cross-device, iOS Safari)    low
```

For each phase: **Objective · Files · Components · Complexity · Deps · Risks · Test plan · Exit criteria** — expanded in the phase kickoff doc before code lands.

Included in P2/P3: **fine-tune header logo + button animations for iOS Safari and desktop** (fix sheen paint cost, verify `-webkit-backdrop-filter`, hardware-accelerated transforms, `touch-action: manipulation`, tap highlight removal, motion budget on low-power mode).

---

## 12. Risk Analysis

- **Regression in Discussion Room (highest)** → contract tests + Playwright E2E per phase.
- **Motion overuse hurting perf on mid-tier Android** → motion budget + `prefers-reduced-motion` fallback verified per phase.
- **iOS Safari quirks** (backdrop-filter, 100vh, autoplay) → device matrix testing at P2, P4, P7.
- **Scope creep** → strict per-phase exit criteria; no cross-phase edits.
- **Token drift** → CI grep for raw color classes (`text-white`, `bg-\[#`) fails build.

---

## 13. Testing Strategy

- **Unit** (Vitest): tokens, hooks, utilities.
- **Component** (Testing Library): every atom/molecule state matrix.
- **E2E** (Playwright): auth, dashboard, full GD flow, report, admin; visual snapshots at xs/md/lg/uw.
- **A11y** (axe + manual SR): each phase gate.
- **Perf** (Lighthouse CI + Web Vitals in Admin): budgets enforced.
- **Cross-browser**: Chrome, Safari (macOS + iOS), Firefox, Edge, Samsung Internet.

---

## 14. Final Design Vision

GD Buddy becomes an **editorial, warm, and precise** AI product — copper-sienna glass on graphite, Cormorant display anchoring an Inter workhorse, motion that is calm and communicative, keyboard-first ergonomics, and a Discussion Room that feels like a live studio rather than a form. It should read as **serious craft**: closer to Linear's rigor and Apple's restraint, wearing GD Buddy's own artisan palette.

---

## Guardrails

- Do NOT change routes, auth, RLS, edge functions, or business logic.
- Do NOT introduce libraries beyond the approved list without a note in the phase brief.
- Every phase ends with: build green, tests green, a11y green, perf budget green, visual review approved.

---

**Next step**: approve this blueprint (or request edits). On approval I will start **Phase 1 — Design Tokens & Theme** and pause for review before Phase 2.
