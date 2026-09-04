# Fix low AI member switching in discussion room

## Verified root causes

1. **AI only speaks after a human message.** `DiscussionRoom.tsx:handleSendMessageDirect` is the only path to `gd-conductor`; there is no autonomous loop or silence watchdog to make AI participants talk to each other.
2. **Conductor caps replies at 2 AI participants per round.** `gd-conductor/index.ts:284` instructs the model to pick "at most 2 AI participants", so most personas stay silent every round by design.
3. **`next_expected_speaker` is generated but never consumed.** The client does not use it to rotate speakers or balance airtime.
4. **No AI floor-request mechanism.** `speaking_turns` supports `participant_kind = 'ai'`, but no code ever requests the mic on behalf of an AI persona during open discussion.
5. **Artificial delay before each conductor call.** `DiscussionRoom.tsx:731-753` waits 1-15s (a synthetic "human speech length") before invoking the conductor, lengthening dead air.
6. **Serial playback.** `room-mixer.ts` plays replies one after another, so even the 1-2 replies that return consume wall-clock time sequentially.
7. **"Skip turn" is a no-op for the room.** When the user skips, the mic reopens but no AI is prompted to speak, creating the long silent stretches seen in the transcript (e.g. 3:38-7:00).

## Goal

Make the room feel like a real GD where members naturally cut in, the moderator enforces balance, and silence does not last more than a few seconds.

## Implementation plan

### 1. AI floor-request path
- Add `request_mic_for_ai(_session_id, _participant_id)` RPC or extend `request_mic` to accept `kind = 'ai'` and a `participant_id` source.
- In `DiscussionRoom.tsx`, create an `aiFloorArbiter` that, when the floor is open and nobody has spoken for a configurable silence threshold (default 4s), picks 1-2 AI participants based on:
  - `interrupt_level` (assertiveness),
  - time since last spoke,
  - topic relevance from recent transcript embeddings,
  - whether they are already in `speaking_turns` queue.
- The arbiter calls `request_mic` with `participant_kind = 'ai'` and then invokes `gd-conductor` with a flag indicating "AI-triggered" so the model knows the user did not speak.

### 2. Use the turn queue for open discussion
- Reuse `useTurnQueue` for AI participants during the open-discussion phase (not just closing round).
- When an AI participant wins the floor, lock the mic briefly while it speaks; when it releases, promote the next queued participant (AI or human).
- Add a `last_spoke_at` timestamp per participant in client state to drive rotation.

### 3. Conductor changes for rotation
- Remove or raise the "at most 2 AI participants" cap when the trigger is silence/AI floor request; instead instruct the model to pick the single most appropriate next speaker, then let the arbiter call again if the floor remains open.
- Consume `next_expected_speaker` on the client: store it in `useSessionStore` and prefer that participant in the next arbiter decision.
- Add a system prompt section that encourages AI personas to respond to the **last AI speaker by name**, not only to the user.

### 4. Silence watchdog
- Add a `useEffect` in `DiscussionRoom.tsx` that starts a 4s timer whenever the room is in `discussion` stage, no one is speaking, and the user is not holding the mic.
- On expiry, the watchdog calls the AI floor arbiter.
- Reset the timer on any human message, AI message start, or mic state change.

### 5. Moderator/invigilator interventions
- Add a `moderatorIntervention` helper in `gd-protocol.ts` that fires when airtime is unbalanced (reuse `airtimeReport`/`moderatorInterjection`).
- When a hog crosses 1.8x fair share or a quiet member falls below 0.35x, the moderator grabs the floor via the same queue and says the interjection line.
- In `gd-conductor`, add a `moderator_override` mode where the model is told to produce only a short moderator line and release the floor.

### 6. Remove or shorten artificial delays
- Replace the fixed 1-15s `humanSpeechDelay` with a much shorter filler/backchannel window (0.5-1.5s) plus speculative pre-generation.
- When the user explicitly skips, treat it as a silence event and immediately trigger the watchdog instead of waiting.

### 7. Parallel/overlap playback for AI replies
- When 2 AI participants are queued back-to-back, allow `room-mixer.ts` to start preparing the second clip while the first plays and to begin playback with a configurable overlap (up to 1.5s) so the second speaker can barge in.
- Duck the first speaker's gain rather than waiting for full completion.

### 8. Metrics and reporting
- Track "AI-initiated turns" and "moderator interventions" per session.
- Add a report card: "Group dynamism" score based on number of distinct speakers, average gap between turns, and interruption/overlap count.
- Track "user floor yield rate" for coaching.

## Suggested build order

1. AI floor-request RPC + client arbiter + silence watchdog (biggest impact).
2. Conductor rotation + `next_expected_speaker` consumption.
3. Moderator interventions for airtime balance.
4. Parallel/overlap playback for queued AI replies.
5. Report metrics for group dynamism.

## Technical notes

- No schema change is required for the queue; `speaking_turns.participant_kind = 'ai'` already exists.
- Add a new optional column `gd_participants.ai_floor_weight` if we want per-persona assertiveness tuning; otherwise derive from `personas.interrupt_level`.
- Keep the existing `gd_format`/timing windows (`gd-protocol.ts`) intact; this work only affects open-discussion behavior.
- Gate the new proactive AI behavior behind the existing `autoMicSetting`/experiment flag so it can be A/B tested.
