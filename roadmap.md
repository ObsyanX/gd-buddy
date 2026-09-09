# Roadmap

## Open
- [ ] Mic/STT fixes (awaiting go-ahead):
  - [ ] Stop the mic before auto-send and auto-skip fire
  - [ ] Disable/close the mic while an AI is speaking (stop feedback capture)
  - [ ] Preserve typed text when the mic is switched on
  - [ ] Pause the auto-send countdown while the floor is locked
  - [ ] Match audio constraints on the video monitor's mic stream
  - [ ] Broadcast speaking/typing state in group mode
  - [ ] Remove or wire up the unused transcription pipelines
- [ ] Improve AI member switching in the discussion room (proactive AI floor requests, silence watchdog, moderator interventions) — plan drafted in `.lovable/plan.md`, awaiting go-ahead.

## Done
- [x] End-to-end audit of the discussion room (solo + group), focused on mic + speech-to-text.
