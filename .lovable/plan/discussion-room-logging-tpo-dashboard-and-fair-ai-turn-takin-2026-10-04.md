# Discussion room logging, TPO dashboard and fair AI turn-taking

## 1. Discussion room test log (solo + instructor-led)
Every room automatically records the moments we have never tested with real people, so you can review what actually happened afterwards.

- Logged events: mic permission result, soundcheck pass/skip, voice detection start/stop and silence release, auto-send countdown start/cancel/fire, floor request/grant/queue/release, interjections, icebreaker prompts, AI reply source (main AI / free backup / personal key / failed), voice playback success or fallback, speech-to-text source and empty results, participant join/leave, drive code joins.
- Each event carries room, person, whether it is a drive room, and timing.
- New "Room health" view:
  - Admin: all rooms, filter by solo / group / drive, failure counts per step.
  - Instructor: only their batches' drive rooms.
  - Session report: a small "What happened in this room" timeline for the owner.

## 2. Instructor (TPO) dashboard without a live session
- Batches: create, rename, archive; add students by email or invite code; remove students.
- Drives: schedule a drive for a batch (topic, track, date/time, group size up to 6); auto-split the batch into groups of 6 with their own drive codes; see status (scheduled / live / done / no-show).
- Cohort reports: works from saved results only — batch heatmap, per-student history, weakest skills, drive attendance, CSV and PDF export.
- Instructor access stays limited to the instructor role and their own batches.

## 3. Fair AI turn-taking
- Each person (human or AI) gets a fair speaking slot (default 45s, set by format), shown as a countdown on the speaker.
- Order: whoever has spoken least goes next; humans who press "Request mic" jump ahead of AIs; no one speaks twice in a row while someone else is waiting.
- AIs request the floor through the same queue as humans instead of just talking.
- When a slot ends: gentle 10s warning, then the floor passes on. AI replies are kept to fit the slot.
- If nobody takes the floor for 8s, the moderator invites the quietest person by name.
- Floor stealing stays available but counts against the stealer's fair share.

## 4. Real 6-student drive check
This needs six real people on six devices with microphones, which I cannot do from here. I will:
- Run an automated check with six signed-in test browsers that join by drive code, confirm all six appear, and take turns through the queue using typed turns.
- Give you a short checklist for the real test; the new log (part 1) will show exactly where anything went wrong.

## Technical details
- New table `room_test_events` (session_id, user_id, kind, payload jsonb, is_drive, created_at) with grants + RLS: owner/participants insert own rows; admins read all; instructors read rows for sessions in their cohorts via a security-definer check. Client helper batches writes and never throws.
- Reuse `instructor_cohorts`, `instructor_cohort_members`, `mock_drives`; add `scheduled_at`, `group_size`, `status` to `mock_drives` if missing; drive groups create `gd_sessions` with `room_code`.
- Turn-taking extends `request_mic`/`release_mic` with `_slot_seconds` and a least-airtime priority; gd-conductor requests the mic for AI speakers before replying and receives the slot length in its prompt.
- Multi-browser check: Playwright script with test accounts minted via auth sessions.
