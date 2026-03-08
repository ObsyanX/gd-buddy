

## Plan Status: Completed vs Remaining

### COMPLETED (Phases 1–5)
1. **Unique Drill IDs** — Done
2. **Error Boundaries** — Done (App.tsx, Session, Report, Drills routes)
3. **Custom Drills to DB** — Done (migration + localStorage auto-migration)
4. **AI Moderator System** — Done (gd-conductor + SessionSetup toggle)
5. **Skill Progression System** — Done (skill_progress table + SkillProgressWidget)
6. **Live Coaching Overlay** — Done (LiveCoachingOverlay + VoiceMetricsPanel integration)
7. **Session Replay** — Done (SessionReplay component in SessionReport)
8. **Scenario-Based Drills** — Done (5 scenario drills + drill-feedback update)
9. **Component Decomposition** — Partially done (SessionHeader, MessageList, MessageInput, SessionSidebar created, but DiscussionRoom still large — not fully refactored to import them)
10. **Ranked Multiplayer / Leaderboard** — Done (user_rankings table + Leaderboard widget)
11. **Topic Difficulty Calibration** — Done (gd-topics edge function updated)
12. **Practice Streaks** — Done (practice_streaks table + widget)
13. **AI Performance Insights** — Done (edge function + PerformanceInsights component)
14. **Session Notes** — Done (session_notes table + SessionNotes in report)

---

### REMAINING / UNFINISHED Items

#### From the Approved Plan — Not Yet Implemented:

**Phase 3–4 Gaps:**
- **Item 9 (partial)**: DiscussionRoom.tsx still not refactored to actually USE the decomposed components (SessionHeader, MessageList, MessageInput, SessionSidebar were created but DiscussionRoom still has its own inline rendering)
- **Item 11.1**: **Zustand global state** — not implemented. State is still scattered across useState + localStorage. No stores created (useSessionStore, useDrillStore, useVoiceStore, useUserStore)

**Phase 4 (Infrastructure & Monitoring) — Sections 15–16:**
- **15.1**: Event-driven architecture / background job queue — not implemented
- **15.2**: AI task queue for async report generation — not implemented
- **16.1–16.3**: Observability (error monitoring, performance tracking, structured logging in edge functions) — not implemented

**Phase 4 (Safety & Optimization) — Sections 17–20:**
- **17**: AI data pipeline for training data aggregation — not implemented
- **18**: Content moderation / safety layer in gd-conductor — not implemented
- **19**: A/B testing / experimentation framework — not implemented
- **20**: Cost optimization (model routing, token budgeting, edge caching) — not implemented

**Phase 4 (Growth) — Sections 13, 21:**
- **13**: Programmatic SEO expansion to 200+ topics — not implemented
- **21**: Enterprise/institutional features (instructor dashboards, cohorts) — not implemented

**Other Unfinished Items from Sections 7–10:**
- **Section 7**: Enhanced Report System — per-turn analysis, comparative radar chart, argument timeline visualization — not implemented
- **Section 10**: Video Coaching UI — real-time floating indicators near webcam (eye contact, posture alerts color-coded) — not implemented
- **Streak auto-update**: Practice streaks don't auto-increment when sessions/drills complete

---

### Recommended Next Steps (by impact & feasibility):

1. **Wire up DiscussionRoom decomposition** — actually import and use the 4 sub-components instead of inline rendering (low effort, high maintainability)
2. **Streak auto-update** — after drill/session completion, increment today_minutes and update streak (low effort, fixes broken feature)
3. **Zustand stores** — replace scattered state with 4 global stores (medium effort, major architecture improvement)
4. **Enhanced Report with per-turn analysis** — add argument timeline + comparative radar to SessionReport (medium effort, high user value)
5. **Video Coaching overlay** — surface eye contact/posture as color-coded indicators near webcam feed (medium effort, differentiation)
6. **Content moderation layer** — add safety checks to gd-conductor (low effort, important for production)
7. **Structured logging in edge functions** — add JSON logging for latency/errors (low effort, operational improvement)
8. **Programmatic SEO expansion** — batch-generate 200+ topic pages (medium effort, growth driver)

