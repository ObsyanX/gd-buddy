# Roadmap

## Open
- [ ] Broadcast speaking/typing state in group mode (needs product decision on indicator UX)
- [ ] Remove or wire up the unused transcription pipelines (`useAudioRecorder` + `speech-to-text` edge function are dead code today)
- [ ] Language handling: allow mixed Hindi/English instead of forcing `en-IN`
- [ ] Improve AI member switching in the discussion room (proactive AI floor requests, silence watchdog, moderator interventions) — plan drafted in `.lovable/plan.md`, awaiting go-ahead.

## Done
- [x] End-to-end audit of the discussion room (solo + group), focused on mic + speech-to-text.
- [x] Stop the mic before auto-send and auto-skip fire
- [x] Disable/close the mic while an AI is speaking (stop feedback capture)
- [x] Preserve typed text when the mic is switched on
- [x] Pause the auto-send countdown while the floor is locked / AI is speaking
- [x] Match audio constraints on the video monitor's and analyser's mic streams
