

## Remaining / Unfinished Items from the Approved Plan

### Architecture & State
1. **Zustand global state stores** — `useSessionStore`, `useDrillStore`, `useVoiceStore`, `useUserStore` not yet created. State is still scattered across `useState` + `localStorage`.

### Infrastructure & Monitoring
2. **Event-driven architecture / background job queue** — no async task processing
3. **AI task queue for async report generation** — not implemented
4. **Error monitoring / centralized error tracking** — no observability service wired up

### Safety & Optimization
5. **AI data pipeline** — training data aggregation from sessions not built
6. **A/B testing / experimentation framework** — not implemented
7. **Deeper cost optimization** — token budgeting strategies and edge caching beyond model selection

### Growth & Business
8. **Programmatic SEO to 200+ topics** — currently ~40 expanded topics, goal was 200+
9. **Enterprise/institutional features** — instructor dashboards, cohorts, batch analytics not built

---

### Recommended Next Priorities (by impact & feasibility)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | Zustand global state stores | Medium | High — major architecture cleanup |
| 2 | Expand SEO to 200+ topics | Medium | High — growth driver |
| 3 | Enterprise instructor dashboard | High | High — differentiation |
| 4 | A/B testing framework | Medium | Medium |
| 5 | AI data pipeline | High | Medium — long-term value |

Say **"proceed"** to start implementing from priority 1 downward.

