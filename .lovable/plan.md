# Roadmap — Complete

All 4 phases shipped.

- **Phase 1** — Analytics foundation, article CMS, ad system, admin scaffold.
- **Phase 2** — Rich CMS (autosave, revisions), comment moderation, newsletter, video/HTML ads, revenue tracking, feature flags.
- **Phase 3** — Multi-tenant roles (editor/analyst), GDPR export/delete, ad revenue attribution + rollup, weekly digest, i18n article variants.
- **Phase 4** — AI intelligence layer:
  - `ai-article-assistant` — outline / draft / improve / SEO metadata
  - `ai-ad-copy` — generates 5 ad-copy variants
  - `ai-anomaly-detector` — z-score anomalies over analytics_daily (30d window)
  - `ai-ctr-predictor` — heuristic × AI quality → predicted CTR
  - `ai-recommend-articles` — personalized/trending article recs
  - Admin UI: `/home/admin/intelligence` (anomaly feed + copy gen + CTR + recs)
  - Article editor: inline **AI Assist** card (outline/draft/improve/SEO)

Google sign-in enabled via Lovable-managed OAuth. Auth page migrated to `lovable.auth.signInWithOAuth`.
