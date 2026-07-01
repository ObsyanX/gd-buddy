
# GD Buddy — Production Edge-Case Hardening Plan

This plan groups the 190 questions into 8 implementation workstreams. Each workstream lists the exact system pieces to build/modify, the decision rules that answer the questions, and the files touched. Everything reuses the existing Supabase Realtime + edge functions + Zustand stack — no new infra.

---

## 1. Turn-Taking Engine (answers Q1–Q10, Q46–Q50, Q101–Q104, Q126–Q140)

**New table: `speaking_turns`**
```
id, session_id, user_id, participant_kind ('human'|'ai'),
requested_at, granted_at, released_at, source ('mic_press'|'raise_hand'|'ai_pick'),
priority int, status ('pending'|'active'|'expired'|'yielded')
```
Grants are issued by a `SECURITY DEFINER` Postgres function `request_mic(session_id)` that:
- Uses `SELECT … FOR UPDATE SKIP LOCKED` on `gd_sessions.mic_lock_holder` — the distributed lock (answers Q102/Q103).
- First-come-first-served by DB `now()` timestamp, tie-broken by "least-recent-speaker" fairness score (answers Q1, Q46, Q129, Q137).
- Rejects if a turn is active; the caller receives `queued` and their row stays `pending` (Q128, Q134, Q138).
- Auto-expires `active` turns after `max_turn_seconds` (default 90s) via `pg_cron` sweeper (Q17, Q47, Q131).

**Client (`DiscussionRoom.tsx`, new `useTurnQueue.tsx`)**
- Mic button calls `request_mic`; UI shows "You're #N in queue" (Q50, Q128).
- Voice Activity Detection (existing `useAudioAnalysis`) must register >200ms of speech within 3s of grant, else turn auto-yields (answers Q2, Q4, Q117 "silent selected speaker").
- Rapid on/off toggling is debounced 800ms + rate-limited to 3 requests / 10s per user (Q9, Q83).
- Shout-over detection: if a non-holder's RMS exceeds holder's by 6 dB for >1.5s, `gd-conductor` posts a moderator warning message and does NOT grant them the floor (Q5, Q127).
- Mic disconnect (`navigator.mediaDevices.ondevicechange` + track `ended` event) auto-releases the turn (Q10).

**AI vs human collision (Q6–Q8, Q15)**
- AI speakers request turns through the same table with `participant_kind='ai'` and `priority=0` (humans are `priority=1`). Any pending human turn preempts a queued AI turn.
- Only one AI turn may be `active` per session (Q8).
- If a human presses mic while AI TTS is playing, `gd-conductor` sends a `stop_tts` realtime event and yields (Q7).
- AI picker rotates through participants weighted by `1 / (spoken_seconds + ε)` so it can't repeatedly select the same person (Q15, Q130, Q137).

---

## 2. Moderator Intelligence (Q11–Q18, Q76–Q80, Q141–Q150, Q181–Q190)

Extend `supabase/functions/gd-conductor/index.ts`:

- **Decision log**: every AI action writes `{action, reason, confidence, evidence_message_ids}` to a new `moderator_decisions` table (answers Q76–Q78 explainability, Q188 unfair-interruption detection).
- **Silence watchdog**: if no `gd_messages` for 30s → conductor asks an open prompt to the quietest participant (Q16, Q135).
- **Topic-drift detector**: cosine similarity of last 3 messages vs topic embedding < 0.35 for 2 turns → "bring back" nudge (Q141–Q144, Q146).
- **Consensus / stagnation detector**: if last 4 messages agree (sentiment + stance similarity) → AI plays devil's advocate with a `fresh_angle` prompt (Q148–Q150, Q186).
- **Confidence gating**: any AI action with `confidence < 0.55` is downgraded to a suggestion rendered as a dismissible banner (Q80). Host/admin can override (Q79).
- **Emotional escalation**: sentiment score < -0.6 sustained over 2 turns triggers a de-escalation message (Q13, Q187).
- **Interruption tracker**: `moderator_decisions.evidence` counts overlapping-speech events per user; >3 in 5min flags "unfairly interrupted" and the next open invite goes to them (Q188, Q189).

---

## 3. Introduction & Conclusion Phase Machine (Q111–Q125, Q151–Q170)

New session lifecycle column `phase enum('lobby','intro','discussion','conclusion','ended')` on `gd_sessions`, driven server-side.

- **Intro phase (60s cap)**: opens with a 10s "who wants to introduce?" prompt.
  - If ≥1 volunteers → first `request_mic` wins (Q115, Q116 = FCFS with AI tiebreak).
  - No volunteers after 10s → AI introduces (Q111, Q112, Q123).
  - AI intro ≤ 45s, always includes topic, rules, and one icebreaker question (Q113, Q124, Q125).
  - Selected but silent >8s → auto-reselect next candidate (Q117, Q118).
  - Off-topic intro (drift detector) → soft interject after 20s, hard cut at cap (Q119–Q121).
  - AI summarises intro in one line before advancing phase (Q122).

- **Conclusion phase (90s cap)**: entered when timer ≤ 90s OR host clicks "Conclude" OR AI detects natural end (all speakers ≥ min contribution + agreement plateau) (Q151–Q153, Q182).
  - "Any final remarks?" prompt broadcast (Q170).
  - Volunteers concluded via same turn queue (Q157, Q158).
  - Concluder disconnect → next in queue, else AI concludes (Q167–Q169).
  - New arguments during conclusion are flagged but not blocked; report notes "introduced new points in conclusion" (Q163, Q164).
  - AI auto-generates a neutral summary if no consensus, explicitly stating disagreement (Q160–Q162).
  - Host can request `+2min` extension once (Q154, Q155).

---

## 4. Transcription & Speaker Attribution (Q25–Q31, Q108–Q110)

- Each participant transcribes **their own mic locally** (existing Browser Whisper) — this is the source of truth for attribution (answers Q26, Q109, Q110: no server-side speaker diarization needed because streams are per-user).
- Transcripts are stamped `client_ts` + `server_ts` at insert; server orders by `server_ts` to fix out-of-order display (Q24, Q108).
- Per-user VAD gates transcription — background noise, TV, or accidental mic without speech never produces a message (Q3, Q30).
- Overlap: if two users' turns overlap by >500ms, both messages are kept but tagged `overlapped=true` and rendered side-by-side (Q25).
- Language auto-detect stays on `en-IN` (handles Hinglish); on repeated low-confidence, offer language switch dropdown (Q28, Q29).
- Fast/slow speech: chunk boundaries widened when WPM > 220 to preserve context (Q31).
- Low-confidence tokens (<0.4) shown greyed; user can click to correct (Q27).

---

## 5. Networking, Reconnect & Realtime (Q19–Q24, Q32–Q38, Q105–Q107)

- **Transport**: keep WebRTC-free architecture — audio never leaves the client (privacy + latency). Realtime uses Supabase channels (WebSocket) for text/state only. Document this decision in `README.md` (Q105).
- **Heartbeat + presence** (already added) doubles as reconnect anchor: last 20 messages + phase + queue snapshot are refetched on reconnect (Q21, Q22).
- **Speaking-while-dropped**: partial transcript is buffered in `localStorage` under `session:{id}:pending` and flushed on reconnect (Q19, Q20).
- **Latency skew**: server_ts ordering + a max 400ms visual delay smooth-buffer keeps messages in order (Q23, Q24, Q106).
- **Host leaves**: `host_migration` — earliest-joined authenticated participant is promoted; if none, session persists with AI moderator only (Q32, Q34).
- **All humans leave**: session auto-ends after 60s with AI-only (Q33).
- **Late join**: allowed until phase=`conclusion`; late joiners get read-only transcript backlog but can't speak until next turn cycle (Q35, Q36).
- **Capacity (max 6)**: 7th join → queued as observer (Q37).
- **Duplicate display names**: server appends `#2`, `#3` suffixes (Q38).
- **Echo**: enforce `echoCancellation: true` (already set) + refuse to grant mic if speaker output device == input device pattern detected (Q107).

---

## 6. Vision, Security, Abuse (Q51–Q64, Q81–Q86)

- **Webcam off / MediaPipe fail**: posture score is marked `n/a` and excluded from average — never zero-filled (Q51, Q52, Q58).
- **Poor lighting / sunglasses / multi-face**: MediaPipe confidence < 0.5 sets `visual_quality='low'`, report shows a warning banner instead of a metric (Q53–Q55).
- **Gaze**: eye-aspect-ratio + face-normal vector distinguishes "reading down" from "looking away to another screen" — threshold 15° off-axis for >3s counts as distraction (Q56, Q57).
- **Room link security**: room codes are 8-char, single-use invite tokens with `max_uses` and `expires_at`; sharing publicly still requires auth (Q59, Q60).
- **Bot prevention**: sign-up already gated by Supabase auth + email; add rate limit per IP on `request_mic` and on join (Q61).
- **Impersonation**: display name changes disabled once session starts; profile avatar shown (Q62).
- **Recording notice**: consent banner on session start, terms in privacy policy (Q63).
- **Data protection**: RLS already restricts to participants; add `pgcrypto`-encrypted feedback comments column (Q64).
- **Abuse / hate speech**: `gd-conductor` runs a lightweight classifier on each message; on hit → auto-mute 30s + warning + admin log (Q81, Q82).
- **Playback / voice cloning / TTS misuse**: mic input frequency histogram check flags perfectly-flat spectral entropy typical of file playback; suspicious runs flagged in report (Q84–Q86) — best-effort, not enforcement.

---

## 7. Scoring, Fairness & Report (Q39–Q45, Q171–Q180)

- **Never-spoke / spoke-once**: report generates with `participation='insufficient'` and skips speaking-quality sub-scores rather than zeroing them (Q39, Q40).
- **Anti-gaming**: raw talk-time is capped at contribution to score; primary weight is `unique_argument_score` from `gd-conductor` novelty checker (Q41, Q42, Q43).
- **Repetition / plagiarism**: novelty check already compares each message against prior messages; repeats reduce novelty sub-score (Q44, Q45).
- **Report timing**: generation starts the moment `phase='ended'`; runs on server so client disconnect doesn't matter (Q171–Q173).
- **Incremental metrics**: `gd_metrics` upserted per turn so partial reports are viable if a session crashes (Q174, Q175, Q97).
- **Per-user delivery**: reports are per-participant, visible only to that user + admin (Q176).
- **Challenge flow**: existing `user_feedback` form doubles as report-dispute channel; disputes surface in Admin dashboard (Q177).
- **New sub-scores**: `introduction_quality`, `conclusion_quality`, `consensus_building`, `listening`, `leadership`, `logical_flow`, `relevance`, `participation_balance` — new columns on `gd_metrics` (Q178–Q180).

---

## 8. Scalability, Fallback & DB Resilience (Q65–Q75, Q91–Q100)

- **Concurrency**: AI calls already use `callAI` with Lovable → Groq fallback (Q69, Q70, Q94, Q98). Add OpenAI Whisper server fallback if browser STT fails 3x (Q96).
- **Rate limits**: per-session AI call budget (default 40/min) enforced in `gd-conductor` before invoking model (Q95).
- **Report retry**: `session_report_jobs` table with `attempts` and `next_run_at` — `job-processor` cron retries up to 5x with exponential backoff (Q71, Q72, Q97).
- **Idempotency**: `user_feedback` gets a unique `(session_id, user_id)` index; upsert replaces (Q73).
- **Race conditions on scores**: all score writes go through `SECURITY DEFINER` function with row-level `FOR UPDATE` (Q74, Q102).
- **DB crash mid-session**: heartbeat + `close_stale_sessions` reconciles orphaned sessions on recovery; client keeps buffered transcript in localStorage (Q75).
- **All-APIs-down**: session degrades to "manual mode" — timer + transcript still work, AI moderator switches to canned prompts, report marked `degraded=true` (Q99, Q100).
- **Hallucination guard**: novelty note requires an `evidence_message_id` from actual transcript; if the model returns a note without valid evidence, the note is dropped (Q91, Q92, Q93).
- **Horizontal scale (Q65–Q68)**: documented in `README.md` — edge functions autoscale, Realtime channels are per-session (no cross-session state), and the only shared hot row (`gd_sessions.mic_lock_holder`) is contended only within a room of ≤6.

---

## Files created / modified

**New**
- `supabase/migrations/*_turn_engine.sql` — `speaking_turns`, `moderator_decisions`, `session_report_jobs`, phase enum, sub-score columns, `request_mic()`, `release_mic()`, `advance_phase()` functions, RLS + GRANTs.
- `src/hooks/useTurnQueue.tsx` — client turn queue + optimistic UI.
- `src/lib/phase-machine.ts` — pure state transitions (unit-testable).
- `src/components/ModeratorDecisionBanner.tsx` — low-confidence suggestions + override button.
- `src/test/phase-machine.test.ts`, `src/test/turn-queue.test.ts`.
- `e2e/turn-fairness.spec.ts` — 6-participant contention + intro/conclusion flow.

**Modified**
- `supabase/functions/gd-conductor/index.ts` — decision logging, silence/drift/consensus/escalation detectors, phase advancement, abuse classifier.
- `src/components/DiscussionRoom.tsx` — wire phase machine, queue UI, host-migration, extension button.
- `src/components/discussion/MessageInput.tsx` — mic gating on queue state, cooldown, low-confidence token highlighting.
- `src/components/SessionReport.tsx` — new sub-scores + `degraded` / `insufficient` states.
- `src/pages/Admin.tsx` — moderator decisions viewer, abuse log, disputes tab.
- `README.md` / `dev-to-article.md` — architecture answers to Q87–Q90 (moat, differentiation).

---

## Rollout order (safe to ship in slices)

1. Migration + `request_mic` lock + `useTurnQueue` (fixes Q1–Q10 immediately).
2. Phase machine + intro/conclusion prompts (Q111–Q170).
3. Moderator decision log + confidence gating (Q76–Q80, Q181–Q190).
4. Detectors: silence, drift, consensus, escalation, abuse (Q13–Q18, Q81–Q82, Q141–Q150).
5. Report sub-scores + retry job (Q171–Q180, Q71–Q75).
6. Fallback + degraded mode + Whisper server fallback (Q94–Q100).
7. E2E + Vitest coverage per slice; each slice must pass `npm run ci` before the next.

Approve this and I'll implement slice 1 first, then loop back for each subsequent slice.
