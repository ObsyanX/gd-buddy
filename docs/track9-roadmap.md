# Track 9 — Platform Engineering, Governance & Enterprise Readiness

Track 9 turns GD Buddy from an advanced AI product into a **governed, measurable, enterprise-grade platform**. It is delivered in 6 slices; each slice is independently shippable and preserves backward compatibility with Tracks 1–8.

## Slice 1 — Governance Foundations ✅ (this commit)

Database + client SDK for every governance concern.

| Table | Purpose | Spec § |
|---|---|---|
| `ai_models` | Central model registry (reasoning/embedding/fact/eval/coaching/graph/report/fallback) | 9.7 |
| `prompts` | Versioned, org-scoped, i18n-aware prompt library with A/B flags | 9.8 |
| `subsystem_versions` | Frozen policy / reasoning / scoring / graph / prompt / model versions per report | 9.9 |
| `calibration_bins` | Rolling (action, confidence-bin) empirical accuracy | 9.3 |
| `overrides` | Human-override audit log (actor, role, original vs manual, reason) | 9.2 |
| `event_log` | Append-only session event stream for replay/audit | 9.11 |
| `ai_costs` | Token + cost per AI call (session/org/user) | 9.10 |
| `safety_incidents` | Safety validator blocks/flags (injection, jailbreak, toxic, PII) | 9.12 |
| `perf_budgets` | p50/p90/p95/p99 targets per subsystem (seeded) | 9.13 |
| `adr_docs` | Architecture Decision Records browsable in-product | 9.17 |
| `research_exports` | Anonymized dataset export jobs | 9.15 |
| `accessibility_prefs` | Per-user captions/contrast/dyslexia/font-scale/speech-rate/locale | 9.4 / 9.5 |
| `benchmark_reports` | AI eval outputs (precision/recall/F1/agreement/ECE) | 9.1 |

Client libraries: `src/lib/registry/models.ts`, `src/lib/registry/prompts.ts`,
`src/lib/governance/calibration.ts`, `src/lib/governance/event-log.ts`.

## Slice 2 — Pipeline Wiring (next)

Insert `safety-validator` and `override-layer` into the pipeline:

```
Reasoning → Policy → Calibration → Safety Validator → Human Override → Dispatcher
                                                                  ↓
                                                             event_log
```

- New edge function: `safety-validator` (prompt-injection heuristics + LLM guard + Groq fallback).
- Extend `intelligence-pipeline.ts` to call `calibrate()` and `shouldAutoAct()`.
- Add `applyOverride()` UI action for Host/Teacher/Recruiter/Admin roles.

## Slice 3 — AI Benchmarking (9.1)

Independent evaluation harness that reads recorded sessions + human labels and
writes to `benchmark_reports`. Ships with:

- Precision / Recall / F1 / FP / FN per action.
- AI ↔ Human agreement (Cohen's κ).
- Calibration error (ECE, reliability diagram).
- Consistency score across replays.

## Slice 4 — Accessibility, i18n, Offline Resilience (9.4 / 9.5 / 9.6)

- `useAccessibility()` hook reading `accessibility_prefs`.
- `AccessibilityCenter` in Settings.
- `src/i18n/*.json` catalogs and `useI18n()` — no hardcoded strings on new screens.
- Offline queue: IndexedDB buffer for participant events, mic queue, local transcript; auto-flush on reconnect.

## Slice 5 — Governance Dashboards (9.10 / 9.13 / 9.14)

Admin-only screens:

- **AI Cost Dashboard** — cost per session/participant, monthly trend, org quotas.
- **Prompt Management Console** — CRUD + A/B toggles + version diff.
- **Model Registry Console** — activate/deactivate per purpose.
- **Performance Dashboard** — p50/p90/p95/p99 vs `perf_budgets`, red/amber/green.
- **Experiment Panel** — feature flags + A/B experiment comparison.
- **Event Explorer** — filter/search `event_log` with replay scrubbing.
- **Safety Center** — filter `safety_incidents` by kind/verdict.

## Slice 6 — Enterprise & Research (9.15 / 9.16 / 9.17)

- Research Export Module — anonymize + zip + signed URL from Edge Function.
- Enterprise Integration Framework — pluggable adapters (Teams / Meet / Zoom / Slack / Moodle / Canvas / LMS / HR) with a shared `IntegrationPlugin` interface.
- ADR viewer — reads `adr_docs`.

## Performance Budgets (seeded)

| Subsystem | p50 | p90 | p95 | p99 |
|---|---|---|---|---|
| mic.allocation | 40 ms | 80 | 100 | 150 |
| policy.evaluation | 15 | 35 | 50 | 90 |
| reasoning.engine | 120 | 250 | 300 | 500 |
| graph.update | 200 | 400 | 500 | 900 |
| embedding.generation | 800 ms | 1.5 s | 2 s | 3.5 s |
| replay.loading | 800 ms | 1.5 s | 2 s | 3.5 s |
| report.generation | 3 s | 7 s | 10 s | 20 s |

## Rollout Plan

1. Slice 1 (this PR) — schema + SDKs. No behavior change.
2. Slice 2 — wire pipeline; behavior changes gated behind `feature.governance.pipeline`.
3. Slice 3 — nightly benchmark job, admin-only dashboard.
4. Slice 4 — accessibility + i18n + offline resilience.
5. Slice 5 — governance dashboards.
6. Slice 6 — enterprise + research + ADRs.

Backward compatibility is preserved: all existing functionality keeps working
because Slice 1 only *adds* tables and helpers; nothing existing is modified.
