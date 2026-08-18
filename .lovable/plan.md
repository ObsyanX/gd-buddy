# Real-World Discussion Room — Analysis & Realism Plan

## 1. What the room does today

**Working well**
- Personas with real traits (role, tone, verbosity, agreeability, interrupt_level, vocab level, distinct voice).
- Conductor prompt with a strong "originality engine": bans echoing, enforces intent distribution (contradict / evidence / question / agree-with-addition), locks each persona to its professional lens.
- Turn queue backed by the database (`speaking_turns`, request/release mic RPCs) with fair promotion and realtime sync.
- Phase machine (lobby → intro → discussion → conclusion → ended) with AI intro, AI closing summary, one-time extension.
- Voice in both directions: streaming transcription in, ElevenLabs TTS out with browser fallback, per-persona voices.
- Live behavioural layer: silence detection, WPM, video/posture metrics, coaching overlay, discussion health meter.
- Post-session scoring, report, replay.

**Where it breaks the illusion of a real GD room**
1. **Speech is sequential, never simultaneous.** The conductor emits `interruption` and `overlap_seconds`, but the client plays each reply one after another; nobody ever cuts in, nobody ever talks over anyone.
2. **No fight for the floor.** In a real GD, 3-4 people start at once and the loudest/fastest wins. Here the AI politely waits for the user to finish and press send.
3. **Turn-taking is request-based, not behavioural.** The AI never grabs the mic on its own; it responds to a round-trip.
4. **Latency is unnatural.** Model + TTS round-trip creates 2-6s of dead air; humans respond in 200-700ms with fillers ("hmm", "right, but—").
5. **No spatial audio / no room presence.** All voices come from the same mono point. A real room has voices placed around a table, ambient noise, paper, chairs.
6. **Timing is not GD-authentic.** Real GDs: 1 min topic reading, 15-20 min discussion, hard warnings at T-2 min, a strict cut-off. Currently the phase caps are generic and there's no visible round clock or reading window.
7. **No non-verbal channel from the AI side.** AI participants have no avatars showing nodding, raised hand, leaning in, or "wants to speak" pressure.
8. **No moderator/panelist presence with authority** — the moderator only speaks at intro/conclusion. Real invigilators interject: "let her finish", "you've spoken thrice, let's hear others".
9. **No group dynamics memory.** Personas don't form alliances, don't reference *each other* by name across turns, don't hold grudges or build coalitions.
10. **No entry/exit realism** — no seating order, no "who speaks first" scramble, no closing round-robin where each person gives a 20s summary.

## 2. Can AI participants replace real humans?

Honest answer, split by dimension:

| Dimension | Replaceable today | With this plan | Ceiling |
|---|---|---|---|
| Argument quality / content | Yes | Yes | Already at or above average peer |
| Persona consistency | Yes | Yes | Better than humans |
| Turn-taking pressure | No | Mostly | Good |
| Interruption & overlap | No | Yes (simulated) | Good |
| Reaction latency | No | Mostly (fillers + speculative pre-gen) | Acceptable |
| Non-verbal / body language read | No | Partly (avatar cues) | Limited without video AI participants |
| Unpredictability, emotion escalation | Partly | Yes | Good |
| Real social risk / stakes | No | No | Fundamentally not replicable |

Conclusion: the room can become a **high-fidelity rehearsal environment** — good enough that the muscle memory transfers (floor-grabbing, interruption recovery, time discipline, summarising under pressure). It cannot replicate genuine social stakes. Target "indistinguishable for training purposes", not "indistinguishable from reality".

## 3. Implementation plan

### Phase A — Real-time floor dynamics (highest impact)
- **Barge-in**: while a user is speaking, if a persona's `interrupt_level` × topic-heat exceeds a threshold, start that AI's audio at an overlap point instead of waiting. Duck the other speaker's volume rather than stopping it.
- **Overlap playback engine**: replace the sequential `await speak()` loop with a scheduler that can play up to 2 audio tracks with a configurable overlap window (use the `overlap_seconds` the conductor already returns).
- **Floor contention**: AI participants request the mic through the same `speaking_turns` queue as humans; add an AI arbiter that decides who wins based on assertiveness, time since last spoke, and topic relevance.
- **Interrupt-recovery coaching**: if the user yields the floor every time they're interrupted, flag it in the report ("you surrendered the floor 4/5 times").

### Phase B — Latency and speech naturalism
- **Speculative generation**: start generating AI replies while the user is still speaking, using the partial transcript; discard/regenerate if the utterance changes direction.
- **Backchannel layer**: short pre-cached audio ("mm-hm", "right", "hold on", "but—") played within 300ms so the room is never silent.
- **Prosody from SSML**: actually consume the `tts_ssml` the conductor emits (rate/pitch per persona and per emotion) instead of flat TTS.
- **Filled pauses and self-repair** in generated text ("I mean—", "sorry, to add to that").

### Phase C — Room environment
- **Spatial audio**: place each persona at a fixed seat angle using Web Audio `PannerNode`; the user is at the head of the table.
- **Ambient room bed**: very low-level room tone, optional, toggleable.
- **Seating table UI**: circular table view with avatars; visual states for speaking, wants-to-speak (raised hand / leaning in), listening, and disengaged.
- **Live floor indicator**: who holds the floor, who is queued, cumulative airtime per person.

### Phase D — Authentic GD protocol and timing
- **Reading window**: 60s topic-reading phase before intro where the mic is locked.
- **Structured formats**: pick a format at setup — Free-form GD, Structured (opening statement round → open debate → closing round), Case-study GD, Abstract-topic GD.
- **Visible round clock** with T-2min warning, T-30s warning, hard stop.
- **Closing round-robin**: each participant gets a fixed 20-30s summary slot, enforced by the queue.
- **Airtime enforcement**: moderator interjects when one person exceeds a share threshold or when someone has stayed silent past a limit.

### Phase E — Group dynamics
- **Cross-persona addressing**: personas reference each other by name and respond to each other, not only to the user.
- **Coalitions and friction**: a lightweight stance model per persona per sub-claim; agreement forms blocs, disagreement escalates tone over turns.
- **Emotion escalation curve**: tone hardens as a thread stays contested, cools after moderator intervention.
- **Persona memory across sessions** (optional): "last time you argued the opposite".

### Phase F — Evaluation realism
- Score the new dimensions: floor-grabbing success rate, interruption handling, airtime share, time discipline, closing quality.
- Panelist-style verdict ("would this candidate be shortlisted?") with the reasoning shown.

## 4. Suggested build order

1. Phase A overlap engine + AI floor contention (biggest realism jump).
2. Phase B backchannels + speculative generation (kills the dead air).
3. Phase D reading window, round clock, closing round-robin (protocol authenticity).
4. Phase C table UI + spatial audio (presence).
5. Phase E cross-persona dynamics.
6. Phase F scoring extension.

## 5. Technical notes

- Overlap playback needs a small audio mixer module (Web Audio graph: per-persona `GainNode` → `PannerNode` → destination) replacing the single `HTMLAudioElement` in `useTextToSpeech`.
- Backchannel clips should be pre-synthesised once per persona voice and cached in storage, not generated per turn.
- Speculative generation doubles AI calls in the worst case — gate it behind a setting and the existing cost optimizer.
- AI floor requests reuse `speaking_turns` with `participant_kind = 'ai'`, so no schema change is required for Phase A.
- The GD format, reading window, and round clock need new columns on `gd_sessions` (format, reading_ends_at, hard_stop_at).
