# Roadmap

## Open
- [x] Bootcamp plan Phase 1: expand all 14 days with curated topics, framework breakdowns, example scripts, pitfalls, and simulation presets
- [x] Bootcamp Phase 2: dedicated day page at /home/bootcamp/day/:dayNumber using the lesson content
- [x] Keep cookie consent in page flow so it never overlays discussion controls; verify desktop and phone
- [x] Transcription pipelines: `useAudioRecorder` already gone; `speech-to-text` is used for personal STT keys
- [x] Fair AI turns: queue, slot countdown, 10s warning, auto-handover, quiet invite
- [x] Typed 6-account drive test + instructor batch tools test (test accounts gdbuddy.drivetest1-6@example.com)

- [ ] Live test: 30s moderator prompt waits while I speak my first Bootcamp answer
- [ ] AI participants keep replying via free backup models when main AI credits run out; clear room message if all fail
- [ ] Human-style audit of solo / group / bootcamp rooms: mic, UI, scrolling at phone → desktop sizes

## Done
- [x] Day 10 bootcamp room: high interruptions + interruption level in setup banner
- [x] Human-style 3-second pause test (desktop-Chrome and Android-style mic behaviour)
- [x] Keep the mic open if the browser ends speech recognition during a pause
- [x] First-turn moderator prompt no longer talks over an open mic
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
