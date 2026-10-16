# Project rules

- Keep Bootcamp lesson content and typed simulation presets in the curriculum data module so later day pages and session initialization share one source of truth.
- Render cookie consent in normal page flow inside the authenticated layout, and outside it only on public pages, so fixed-height discussion rooms reserve space rather than covering controls.- Param-guarded pages (e.g. BootcampDayPage) must wrap useParams-derived lookups in useStickyRouteValue before redirecting — the outgoing page stays mounted one commit with the NEW url, so naive guards bounce navigation mid-transition.
