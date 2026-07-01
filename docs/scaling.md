# Horizontal Scaling Notes — GD Buddy

Reference for operators. Runtime code changes are **not** required to hit the
targets below; this documents the guarantees the current architecture already
provides and the knobs to turn when load grows.

## What is already safe to scale horizontally

- **Edge functions** (`gd-conductor`, `session-phase`, `session-detectors`,
  `ai-with-fallback`) are stateless. Any number of concurrent invocations is
  fine — all shared state lives in Postgres.
- **Realtime channels** are keyed by `session_id`. Two participants of the same
  session must land on the same channel, which Supabase Realtime handles;
  different sessions are independently sharded.
- **Turn-taking** (`request_mic` / `release_mic`) uses `SELECT ... FOR UPDATE`
  on `gd_sessions`, so mic-lock races across regions are serialised at the
  database.

## Idempotency

All AI-side writes that can be retried (scoring, TTS logging, notifications)
should carry the key produced by `idempotencyKey` in `src/lib/scoring-guards.ts`.
Server-side unique constraints (already in place on `speaking_turns` via
`(session_id, user_id, requested_at)` and on `moderator_decisions` via natural
keys) absorb duplicates.

## Fallback path

`callAI` in `supabase/functions/_shared/ai-with-fallback.ts` already fails
over from Lovable AI Gateway to Groq (`llama-3.3-70b-versatile`). No caller
change is needed when the primary tips over.

## Scaling knobs

| Symptom                         | Knob                                                      |
| ------------------------------- | --------------------------------------------------------- |
| Mic queue feels slow            | Lower `mic_lock_expires_at` window in `request_mic` (90s) |
| Stale sessions piling up        | Lower `_idle_minutes` in `close_stale_sessions` (15m)     |
| Host-migration too aggressive   | Raise `_idle_seconds` in `migrate_session_host` (45s)     |
| AI cost spike                   | Bias `callAI` to Groq first for `session-detectors`       |
| Realtime fan-out saturating     | Cap active participants per room (currently 6)            |

## Observability

- `/home/health` reports active sessions, audio state, and channel counts.
- `moderator_decisions` is the audit log: every AI moderation action, host
  migration, and phase transition writes a row here — grep by `action`.
- `error_logs` (surfaced in Admin) captures uncaught client exceptions.
