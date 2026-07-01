# GD Buddy — Merged Discussion Intelligence Roadmap (v2)

Supersedes the previous plan. Every earlier capability is retained; the 19 new capabilities are merged in, duplicates collapsed, and the whole thing re-ordered around a single event pipeline.

## Canonical event pipeline

```text
Session Events → Detectors → AI Reasoning Engine → Moderator Policy Engine → Action Dispatcher → UI / DB / TTS
                    ↑                                    ↑
              Participant Behaviour   Discussion Health Score
              Emotional Intel         Explainability Trace (persisted)
```

- **Detectors** stay dumb (silence, drift, dominance, interruption, fallacy hits, sentiment).
- **Reasoning Engine** (new) answers: what happened, why, what interventions exist, confidence, evidence, should we act.
- **Policy Engine** validates against configurable rules only — no reasoning.
- **Action Dispatcher** executes (mic control, prompts, phase change, notifications, report events) and writes a full explainability record.

## Cross-cutting foundations (built once, used everywhere)

- **Explainability record** on every AI action: `{action, matched_rule, reasoning_trace, evidence, confidence, alternatives, chosen_because}` → extends `moderator_decisions`.
- **Enterprise Configuration Center**: `organizations`, `org_configs` (speaking limits, policy rules, evaluation weights, moderator personality, privacy, memory, report templates, accessibility). Session inherits org config, can override.
- **Privacy & Governance**: consent flags on `gd_participants`, retention job, export/delete RPCs, RBAC via existing `user_roles`, PII-masking utility, audit log table `audit_events`.
- **Observability**: `perf_events` table + `/home/health` dashboard extended with AI latency, STT latency, queue latency, policy eval latency, embedding latency, fallback usage, moderator response time, error rates.
- **Plugin registry**: `src/plugins/*` with typed contracts (`ModeratorPlugin`, `AnalyticsPlugin`, `FactCheckPlugin`, `ScoringPlugin`, `LanguagePlugin`, `OrgEvaluationPlugin`). Registry is a thin dispatcher; core stays lightweight.

## Multi-agent split

Each responsibility becomes its own edge function communicating via structured events (Supabase Realtime channel `session:{id}:agents` + `moderator_decisions` audit trail):

| Agent | Edge fn | Owns |
| --- | --- | --- |
| Moderator | `moderator-agent` | Executes policy decisions, TTS prompts |
| Reasoning | `reasoning-agent` | Interprets detector output |
| Memory | `memory-agent` (was `message-indexer`) | Embeddings, semantic recall |
| Fact Verification | `fact-agent` | Claim extraction + verification |
| Knowledge Graph | `graph-agent` (was `graph-builder`) | Nodes/edges upsert |
| Evaluation | `eval-agent` (was `participant-scorer`) | Sub-scores + radar |
| Coaching | `coach-agent` | Personalised improvement report |
| Report Generator | `report-agent` | Final report assembly |
| Analytics | `analytics-agent` | Org-level rollups + reflection reports |

All agents use `callAI` (Lovable AI → Groq fallback).

---

## Rollout — 8 tracks, strict dependency order

### Track 1 — Foundations (unblocks everything)
- Tables: `organizations`, `org_configs`, `moderation_policies` (global + org + session), `audit_events`, `perf_events`, `explainability_records` (or extend `moderator_decisions`).
- Plugin registry scaffolding + typed contracts.
- Privacy: consent columns, RBAC helpers, PII-masking util, retention cron.
- Observability instrumentation helpers (`measure(name, fn)`) wired into every existing edge function.

### Track 2 — Reasoning + Policy Engine
- `reasoning-agent` edge fn: takes detector output + participant profiles + health score, returns `Intervention[]` with confidence/evidence/alternatives.
- `policy-engine` edge fn: pure validator over `moderation_policies` rows (8 seeded rules from previous plan + strictness knob from moderator personality).
- `action-dispatcher` edge fn: applies decision, writes explainability record, emits realtime event.
- Existing `session-detectors` refactored to only emit signals (no direct DB writes to `moderator_decisions`).

### Track 3 — Participant Behaviour + Health + Emotional Intel
- `participant_profiles` table (live rolling scores: leadership, confidence, listening, communication, logical reasoning, critical thinking, respectfulness, interruptions, evidence, consensus, curiosity, question quality, response quality).
- `discussion_health` view/materialised score combining: participation, fairness, topic relevance, novelty, engagement, logical flow, evidence, counterarguments, consensus, AI confidence.
- **Emotional Intelligence Layer** in `eval-agent`: hesitation, frustration, nervousness, confidence, aggression, excitement, stress (from prosody + text). Feeds Reasoning Engine.
- Moderator strictness auto-adapts from health score + personality.

### Track 4 — Turn-Taking, Silence, Completion (from v1, upgraded)
- Weighted `request_mic` scoring (waiting, fairness, prior turns, duration, raise-hand, interruptions, recency).
- Adaptive `mic_lock_expires_at` per phase (intro 45 / main 90 / counter 45 / clarification 30 / conclusion 60). Argument→rebuttal intent classifier via `reasoning-agent`.
- **Multi-stage silence**: 3 varied engagement attempts (prompt library on `moderator-agent`); on final attempt offer "start with an example / provide a perspective"; still silent → `terminate_insufficient_participation` → phase machine ends + Insufficient Participation report.
- **AI completion detector**: coverage %, all-spoken?, novelty window, counter-response ratio, LLM convergence. Emits `recommend_conclusion` — host accepts or extends.

### Track 5 — Memory, Duplicates, Contradictions, Fallacies, Facts
- `gd_message_embeddings` (pgvector 3072, HNSW, cosine) via `memory-agent` using `google/gemini-embedding-001`.
- `search_session_memory(session_id, query_embedding, k)` RPC.
- **Duplicate detection** (cosine ≥ 0.82) → polite nudge.
- **Contradiction tracking**: `participant_stances` + graph; polite evolution nudge, never punitive.
- **Logical fallacy detection** (fallacy plugin): strawman, false dilemma, circular, slippery slope, hasty generalisation, ad hominem, false cause, appeal to authority, unsupported assertion. Report-only.
- **Fact Verification Layer** (fact plugin, optional per org): claim extraction + verification. Never interrupts — findings appended to report.
- **Discussion Intelligence prompts**: quality-drop bank ("what if opposite", "counterargument", "evidence", "missing perspective").

### Track 6 — Knowledge Graph, Timeline, Advanced Scoring, Coaching
- `discussion_nodes` (topic/subtopic/argument/evidence/counter/example/consensus/conclusion) + `discussion_edges` (supports/refutes/elaborates/exemplifies/concludes), built incrementally by `graph-agent`.
- `session_timeline` SQL view over `moderator_decisions` + `gd_messages` + `speaking_turns` + phase transitions.
- `gd_metrics` sub-scores: confidence, vocabulary, clarity, logical_reasoning, evidence_usage, examples, data_backing, persuasiveness, critical_thinking, relevance, listening, response_quality, builds_on_others, respectful_disagreement, consensus_building — radar chart in report.
- **Coaching Engine** (`coach-agent`): strengths, weaknesses, practice recs, speaking/leadership/evidence/logic suggestions.
- **Recommendation Engine**: cross-session personalised recs from `participant_profiles` history.

### Track 7 — Moderator Personalities, Replay, Enterprise Analytics
- **Moderator Personalities** rows in `org_configs`: Interview / Mock GD / Debate / Academic / Classroom / Corporate / Brainstorm / Case Study. Each controls strictness, speaking time defaults, intervention frequency, evaluation weights, feedback style. Loaded by policy engine.
- **Session Replay Engine**: synchronised timeline + transcript + turns + decisions + graph + report; scrubber jumps to any event.
- **Enterprise Analytics** (`analytics-agent`): avg participation, interruptions, topic trends, consensus rate, AI intervention frequency, participant improvement, completion rate, health trends.
- **Continuous Improvement Engine**: post-session reflection report (best/worst interventions, most-triggered policies, best-performing personality). Recommendations only — never auto-mutates policies.

### Track 8 — Unified Dashboard, Load/Latency, E2E, Moderator UI
- **Unified Discussion Intelligence Dashboard** `/home/intelligence`: health, participant profiles, knowledge graph, timeline, semantic memory search, replay, explainability, moderator decisions, fact-check panel, coaching, org analytics, engineering metrics.
- **Moderator UI panel**: table of `moderator_decisions` (host migrations, overlaps, interruptions, phase changes) with timestamp + session filter + expandable reasoning trace.
- **Load & latency dashboards** (uses `perf_events`): scoring throughput, networking reconnect time, TTS stream latency, policy eval P50/P95, embedding P50/P95, fallback rate.
- **Playwright E2E**: full GD flow — join → intro → mic requests → interruption → TTS playback → completion detection → conclusion → report — asserting invigilator signals, scoring writes, TTS-ready output, zero runtime errors. Extends existing `e2e/admin.spec.ts`.
- **Load tests** (k6 or Playwright fanout) simulating 2–6 participants × N concurrent rooms; failure budgets fail the CI build.

---

## Dependency graph

```text
1 Foundations ── required by all
       ↓
2 Reasoning + Policy ── required by 3,4,5,6,7
       ↓
3 Behaviour + Health + Emotion ─┐
4 Turn/Silence/Completion       ├─ feed 6,7
5 Memory/Duplicates/Facts       ┘
       ↓
6 Graph + Scoring + Coaching
       ↓
7 Personalities + Replay + Enterprise Analytics
       ↓
8 Unified Dashboard + Load/E2E + Moderator UI
```

## Backward compatibility

- All new tables additive; old sessions render with graceful fallbacks.
- FCFS `request_mic` still works if weights unset.
- Fixed 90-s timer retained as fallback when `phase` unknown.
- Existing `moderator_decisions` schema is extended, not replaced.
- Plugin registry is opt-in per org; default org config reproduces current behaviour.

## Deliverable per track

Schema migration → edge fn(s) → typed client hook(s) → UI surface → vitest for pure logic → doc update in `docs/`.

Reply **approve** to lock this plan and I'll start Track 1. Reply with edits to iterate.
