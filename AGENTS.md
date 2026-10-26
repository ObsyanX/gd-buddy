# Project rules

- Keep Bootcamp lesson content and typed simulation presets in the curriculum data module so later day pages and session initialization share one source of truth.
- Render cookie consent in normal page flow inside the authenticated layout, and outside it only on public pages, so fixed-height discussion rooms reserve space rather than covering controls.
- Param-guarded pages (e.g. BootcampDayPage) must wrap useParams-derived lookups in useStickyRouteValue before redirecting — the outgoing page stays mounted one commit with the NEW url, so naive guards bounce navigation mid-transition.
- Speech recognition sessions ended by the browser (not by stopListening) must be resumed with the heard text kept as prefix — mobile browsers end sessions during thinking pauses, which would otherwise close the user's turn.
- Room timers that make the moderator speak must not fire while the user's mic is open — AI speech stops the mic, cutting the user off mid-answer.
- When the room writes start_time/status to the session row it must update local session state too — the protocol clock (reading window, moderator prompts, closing round, time limit) derives from session.start_time.
- A human speaking turn is only held while the mic is open; release stale or late-granted turns — otherwise a "Your speaking slot" countdown runs with the mic off.
- Room controls are 44px on touch screens and may shrink only under `[@media(pointer:fine)]`, not by breakpoint — touch tablets in landscape use the desktop layout.
