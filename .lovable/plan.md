## Track 3: Participant Behaviour + Discussion Health + Emotional Intelligence

**Progress:** Tracks 1–2 done. This is Track 3 of 8 → **5 tracks remain** after this (Tracks 4–8).

---

### Goal
Give the intelligence pipeline (Reasoning → Policy → Dispatcher, built in Track 2) real per-participant behavioural signals and a session-wide health score, plus lightweight emotional-intelligence features from text + prosody. Everything feeds the policy engine as new signals — no new decision path.

---

### Deliverables

**1. Database (single migration)**
- `participant_behaviour` — rolling per-participant state per session
  - `session_id`, `participant_id`, `talk_time_ms`, `turn_count`, `interruption_count`, `avg_turn_ms`, `dominance_score` (0–1), `engagement_score` (0–1), `sentiment_avg` (−1..1), `sentiment_trend` (−1..1), `emotion_label`, `last_spoke_at`, `updated_at`
- `discussion_health` — session-level rollup, one row per session, updated on each tick
  - `participation_gini`, `interruption_rate`, `sentiment_index`, `topic_focus`, `energy`, `overall_health` (0–100), `updated_at`
- `emotion_events` — append-only per utterance
  - `session_id`, `participant_id`, `source` (`text` | `prosody`), `label`, `valence`, `arousal`, `confidence`, `evidence` (jsonb), `created_at`
- GRANTs + RLS scoped via `can_access_session(session_id, auth.uid())`; service_role full access. Realtime enabled on `discussion_health` + `participant_behaviour`.

**2. Edge function `behaviour-aggregator`**
- Trigger: called on turn release + on a 15s tick from `session-detectors`.
- Reads recent `speaking_turns`, `gd_messages`, `emotion_events`.
- Computes: talk-time share, Gini for participation, interruption rate (from Slice 5 attribution), sentiment averages, dominance/engagement.
- Upserts `participant_behaviour` and `discussion_health`.
- Emits a `behaviour_snapshot` signal into the Track 2 pipeline (does not decide actions itself).

**3. Edge function `emotion-analyzer`**
- Input: latest transcript segment + optional prosody features (pitch mean/var, energy, speaking rate) already produced client-side.
- Text emotion via Lovable AI (`google/gemini-2.5-flash`) with Groq fallback (existing `_shared/ai-with-fallback.ts`). Strict JSON schema: `{label, valence, arousal, confidence, rationale}`.
- Prosody emotion via deterministic rules on the client-supplied features (no audio upload).
- Fuses both into one `emotion_events` row; PII-masks rationale via `src/lib/pii.ts`.

**4. Client library `src/lib/behaviour/`**
- `prosody-features.ts` — extracts pitch/energy/rate from existing `useAudioAnalysis` frames (pure functions, unit-tested).
- `behaviour-client.ts` — subscribes to `participant_behaviour` + `discussion_health` realtime and exposes a `useDiscussionHealth(sessionId)` + `useParticipantBehaviour(sessionId)` hook.
- `emotion-client.ts` — posts transcript + prosody snapshot to `emotion-analyzer`; debounced per participant.

**5. Policy wiring (no engine changes)**
- Seed 4 new rows into `moderation_policies` matching signals `behaviour_snapshot` + `emotion_event`:
  - Dominance > 0.6 for 60s → nudge_share_time.
  - Engagement < 0.25 for a participant → invite_to_speak.
  - Negative sentiment spike (valence < −0.5, confidence > 0.7) → de-escalation prompt.
  - Health score < 40 for 2 consecutive ticks → moderator summary + refocus.
- All handled by existing `policy-engine` + `action-dispatcher`; explainability fields already populated.

**6. UI (read-only surfaces, no new pages)**
- `DiscussionHealthMeter` component in `SessionHeader` — small 0–100 ring bound to `useDiscussionHealth`.
- `ParticipantBehaviourChip` on participant tiles — dominance/engagement dots + emotion label tooltip.
- Admin dashboard: new "Behaviour & Health" tab reading recent `discussion_health` and top dominance/interruption outliers.

**7. Tests**
- `src/test/behaviour-metrics.test.ts` — Gini, dominance, engagement, interruption rate.
- `src/test/prosody-features.test.ts` — pitch/energy/rate extraction on synthetic frames.
- `src/test/emotion-fusion.test.ts` — text+prosody fusion rules and PII masking.
- Playwright: extend `e2e/admin.spec.ts` with a smoke check that the health tab renders.

---

### Technical notes
- All heavy math runs server-side in `behaviour-aggregator` to keep clients light; client only aggregates its own audio frames.
- Emotion inference is opt-in per participant via existing consent flag on `gd_participants`; when off, only prosody rules run and no `text` emotion rows are written.
- Idempotency: aggregator uses `(session_id, tick_bucket)` key with the Track 2 dispatcher's `idempotencyKey` pattern.

---

### Out of scope for Track 3
Coaching prompts, memory/embeddings, knowledge graph, replay, personalities — those land in Tracks 4–8.

Approve to implement Track 3.
