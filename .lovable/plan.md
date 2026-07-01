
# Track 9 — Platform Engineering, Governance & Enterprise Readiness

Final track. Wraps Tracks 1–8 in governance, measurement, safety, accessibility, i18n, cost control, versioning, and enterprise integration. No existing functionality is removed. Delivered in 6 slices so each is reviewable and reversible.

## Architecture change (single most important)

Insert a **Human Override Layer** between the Policy Engine and the Action Dispatcher, and a **Safety Validator** in front of every AI call.

```text
Detectors → Reasoning Agent → Policy Engine → Human Override Layer → Action Dispatcher
                                    ↑                    ↑
                     Calibrated Confidence      Audit Log (every override)

Every AI call:  caller → Safety Validator → Model Registry → Prompt Registry → Gateway
```

## Slice 1 — Governance foundations (DB + libs)

New tables (all with GRANT + RLS, service_role for edge functions, org-scoped where relevant):

- `ai_models` — registry: id, purpose (reasoning/embedding/fact/eval/coaching/graph/report/fallback), vendor, model_id, version, params, active.
- `prompts` — id, category, version, language, owner, org_id?, body, ab_flag, active.
- `subsystem_versions` — policy/reasoning/scoring/graph/prompt/model versions, referenced by every generated report.
- `calibration_bins` — per-action confidence bin → empirical accuracy (rolling window).
- `overrides` — session_id, actor, role, original_decision, manual_decision, reason, ts.
- `event_log` — append-only event sourcing (session_id, kind, actor, payload jsonb, ts, seq).
- `ai_costs` — request_id, function, model_id, input_tokens, output_tokens, cost_estimate, session_id, org_id.
- `experiments_v2` extends existing `experiments` with policy/prompt/personality/scoring scopes.
- `safety_incidents` — request_id, kind (injection/jailbreak/toxic/unsafe), verdict, snippet_hash.
- `perf_budgets` — name, p50/p90/p95/p99 targets; alerts written to `error_logs`.
- `adr_docs` — id, title, status, problem, decision, alternatives, tradeoffs, consequences, md_body.
- `research_exports` — id, org_id, scope, anonymized_at, download_url, expires_at.
- `accessibility_prefs` — user_id/org_id, captions, high_contrast, dyslexia_font, font_scale, timer_visibility, speech_rate, colorblind_palette.

Libs:
- `src/lib/registry/models.ts`, `src/lib/registry/prompts.ts` — typed lookups with cache + version pinning.
- `src/lib/governance/calibration.ts` — Platt/isotonic-style bin lookup; `calibrate(action, raw) → calibrated`.
- `src/lib/governance/override.ts` — apply/record override; used by dispatcher client.
- `src/lib/governance/event-log.ts` — `logEvent(kind, payload)` batched writer.
- `src/lib/safety/validator.ts` — pre-call prompt-injection/jailbreak regex + policy check; post-call toxicity check.
- `src/lib/cost/tracker.ts` — extends existing `cost-optimizer.ts` to also write `ai_costs` with model_id + org_id.

## Slice 2 — Pipeline wiring (safety, calibration, override, versioning)

- Add `_shared/ai-guard.ts` used by every edge function: wraps `callAI` → Safety Validator → Model Registry lookup → Prompt Registry lookup → cost tracker → response safety check.
- Update `reasoning-agent`, `policy-engine`, `action-dispatcher`, `fact-checker`, `fallacy-detector`, `coaching-engine`, `completion-detector`, `memory-indexer`, `graph-builder`, `emotion-analyzer` to route through `ai-guard`.
- `action-dispatcher` gains an override check: if confidence (calibrated) < action threshold OR override pending → write as **recommendation** instead of auto-applying. Persist `subsystem_versions` snapshot on every `moderator_decisions` row and every `session_scores` row.
- New edge function `human-override` for host/teacher/recruiter/admin actions (grant mic, skip queue, cancel intervention, force conclusion, extend, edit score, re-evaluate). Writes `overrides` + `event_log` + updates target row atomically.
- New edge function `calibration-updater` on cron (hourly): recomputes `calibration_bins` from `moderator_decisions` outcomes.

## Slice 3 — AI evaluation & benchmarking

- New edge function `benchmark-runner` — offline evaluation over labeled datasets (stored in `training_data`): computes precision/recall/F1/FP/FN, AI–human agreement, moderator/report consistency, calibration ECE. Writes to a new `benchmark_reports` table.
- CLI-friendly Vitest suite `src/test/track9-benchmark.test.ts` for deterministic checks on the scoring math.
- Independent from production scoring: runs against snapshots, never mutates live rows.

## Slice 4 — Accessibility, i18n, offline

- `src/lib/a11y/prefs.ts` + `AccessibilityCenter` page under `/home/settings/accessibility`. Applies CSS variables (font scale, contrast, dyslexia font via OpenDyslexic fallback), colorblind-safe chart palette tokens, and passes speech rate to TTS.
- Live captions surface: reuse existing STT stream into a caption overlay in `DiscussionRoom` (toggle from a11y prefs). Screen-reader labels audit on session controls.
- i18n: add `react-i18next` with `en` default and `hi`, `es` scaffolds. Move visible strings in session UI, reports, and moderator prompts to `src/locales/*.json`. Prompt Registry stores per-language variants; reasoning agent picks by session locale.
- Offline resilience: `src/lib/offline/session-buffer.ts` — IndexedDB-backed queue for events, mic requests, transcript chunks; flush on reconnect. When AI unavailable, `intelligence-pipeline.ts` degrades to rule-based `policy-engine` only and local timers; session never terminates on AI failure.

## Slice 5 — Ops: budgets, experiments, event explorer, cost dashboard

- `src/lib/observability/budgets.ts` reads `perf_budgets` and asserts against `perf_events` percentiles; writes breaches to `error_logs` severity=warn.
- Extend existing `useExperimentStore` with scopes (`policy`, `prompt`, `personality`, `scoring`) and per-experiment metrics rollup (quality, engagement, completion, interventions).
- New admin pages (all under `/home/admin`, admin-only):
  - `AIBenchmarks` — benchmark reports + calibration curves.
  - `Governance` — overrides feed, audit log, ADR list.
  - `AICost` — costs by function/model/org; quotas.
  - `PromptConsole` — CRUD prompts with version + A/B flag.
  - `ModelRegistry` — CRUD models, activate/deactivate.
  - `Experiments` — assignments and results.
  - `EventExplorer` — filter/replay `event_log`.
  - `PerformanceDashboard` — SLA percentiles vs budgets.
  - `EnterpriseConsole` — org configs, quotas, accessibility defaults.
  - `ResearchExports` — anonymized dataset builder.
- Reuse `ResponsiveTable` and existing chart tokens; mobile-first.

## Slice 6 — Enterprise integrations, research mode, ADRs, docs

- `src/lib/integrations/*` plugin stubs (Teams, Meet, Zoom, Slack, Moodle, Canvas, HR, LMS) implementing the existing `pluginRegistry` contract — optional, org-enabled.
- `research-exporter` edge function: anonymizes transcripts (uses `pii.ts`), strips user_ids, exports session metadata, stats, knowledge graph, timeline as signed URL.
- `docs/adr/` — seed with ADR-001 Multi-Agent AI, ADR-002 Policy Engine, ADR-003 Reasoning Layer, ADR-004 pgvector, ADR-005 Supabase Realtime, ADR-006 Event Sourcing. Also written into `adr_docs` for in-app browsing.
- Docs: `docs/track9-governance.md`, `docs/track9-a11y-i18n.md`, `docs/track9-enterprise.md`.

## Verification

- Vitest: `track9-calibration.test.ts`, `track9-safety.test.ts`, `track9-override.test.ts`, `track9-benchmark.test.ts`, `track9-cost.test.ts`.
- Playwright: `e2e/track9-a11y.spec.ts` (keyboard nav + captions), `e2e/track9-override.spec.ts` (host cancels intervention), `e2e/track9-offline.spec.ts` (offline → reconnect flush).
- Extend `bun run ci` to include the new suites and budget assertion.

## Out of scope

- No changes to Tracks 1–8 semantics; only additive wrappers (guard, override, versioning tag) and admin surfaces.
- No new AI provider onboarding beyond existing Lovable AI + Groq fallback.
- No native mobile packaging.

## Deliverables checklist

AI Benchmark Dashboard · Governance Dashboard · Accessibility Center · Enterprise Console · AI Cost Dashboard · Prompt Console · Model Registry · Experiments Panel · Event Explorer · Performance Dashboard · Research Export Module · Integration Plugin Framework · ADR docs (in-repo + in-app).

Say **approve** to start with Slice 1 (DB + governance libs). I will proceed slice-by-slice and report tests after each.
