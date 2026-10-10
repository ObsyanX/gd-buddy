# Roadmap

## Open
- [ ] Remove or wire up the unused transcription pipelines (`useAudioRecorder` + `speech-to-text` edge function are dead code today)
- [x] Fair AI turns: queue, slot countdown, 10s warning, auto-handover, quiet invite
- [x] Typed 6-account drive test + instructor batch tools test (test accounts gdbuddy.drivetest1-6@example.com)

## Done
- [x] Mock drive rooms saved as real group rooms (host + code join)
- [x] Voice detection: noise calibration, 1.4s release, no restarts
- [x] Typing indicator shared in group rooms
- [x] Speaking language choice in Settings (Indian English / Hindi / US English)
- [x] Bootcamp on the main phone bar
- [x] OpenRouter free models added to AI backups; all server functions published
- [x] Bootcamp in phone/tablet menu; always-visible chat scrollbar; Sarvam voice styles live
- [x] End-to-end audit of the discussion room (solo + group), focused on mic + speech-to-text.
- [x] Stop the mic before auto-send and auto-skip fire
- [x] Disable/close the mic while an AI is speaking (stop feedback capture)
- [x] Preserve typed text when the mic is switched on
- [x] Pause the auto-send countdown while the floor is locked / AI is speaking
- [x] Match audio constraints on the video monitor's and analyser's mic streams
