# Phase 2 — Depth pass on CMS, Ads, Analytics

Phase 1 shipped thin slices of Analytics, Article CMS, and Ads. Phase 2 deepens each system to production feature-parity with the original spec.

## Roadmap at a glance

- **Phase 1** ✅ shipped — schemas, tracking, admin CRUD, one placement each, `/blog`.
- **Phase 2** ⬅ this plan — rich text, video/popup ads, comment moderation, affiliate revenue, A/B ads, auto-refresh, newsletter.
- **Phase 3** — Governance & scale: multi-tenant admin roles (editor/analyst), scheduled reports (email digest), ad revenue attribution to author payouts, GDPR export/delete, i18n article variants.
- **Phase 4** — Intelligence: AI article assistant (draft/summarize/SEO), AI ad copy generator, anomaly detection on analytics, predictive CTR, recommendation engine for related articles.

So after Phase 2, **2 phases remain** (Phase 3 governance/scale, Phase 4 intelligence).

## Phase 2 deliverables

### A. Article CMS depth
- **Tiptap rich-text editor** (headings, bold/italic/link, image upload to `article-media`, code block w/ language, blockquote, callouts, tables, embed URL). Toggle Markdown ⇄ Rich text stored as JSON + rendered HTML column.
- **Draft autosave** (30s debounce) + **revision history** table (`article_revisions`) with diff viewer + restore.
- **Comment moderation queue**: `/admin/comments` list with status (`pending|approved|spam|deleted`), bulk actions, per-comment audit trail. Public `/blog/:slug` shows only `approved`.
- **Article likes / share counters** wired on public page + admin metrics column.
- **Related articles auto-suggest** by shared tags + category (materialized function).
- **Newsletter subscribers** admin `/admin/newsletter` (list, export CSV, unsubscribe token, double-opt-in edge function).

### B. Advertisement depth
- **Video ads** — new `media_type` (`image|video|html`), muted autoplay, poster, click-through, view=50% for 2s counts as impression.
- **Popup ads + sticky-footer + interstitial** placements with per-visitor dismiss memory.
- **A/B experiments for ads** — `ad_experiments` table, variant assignment via `useExperimentStore` (already exists), CTR per variant.
- **Auto-refresh** — placement config `refresh_ms` (min 30s), pauses when tab hidden or user interacting.
- **Budget enforcement** — daily/lifetime spend caps in `ad-serve`; auto-pause when exceeded; admin banner on `/admin/ads`.
- **Affiliate revenue attribution** — `ad_conversions` table, postback URL, revenue rollup into `analytics_daily`.
- **UTM builder UI** + link preview in ad edit form.

### C. Analytics depth
- **Cohort analysis** — retention curves by signup week.
- **Funnels** — configurable step funnels (landing → signup → first session → paid).
- **Revenue dashboard** — merges Stripe/Paddle (existing) + ad revenue + affiliate.
- **Scheduled digest** — weekly email to admins with top KPIs (uses newsletter infra).
- **Anomaly flags** — z-score on daily rollup, surfaces in `/admin/analytics` header.
- **Real-time visitors** widget via Supabase Realtime on `visitor_sessions`.

### D. Cross-cutting
- **Feature flags**: `admin_settings` table wired to a `useFeatureFlag` hook (gates video ads, popups, autosave, etc.).
- **Audit log viewer** `/admin/audit` (already has `audit_events` table).
- **Reports CSV export** for all admin tables.

## Delivery order

```text
1. Migration — article_revisions, ad_experiments, ad_conversions, admin_settings, comment moderation cols
2. Edge functions — newsletter-subscribe, newsletter-confirm, newsletter-digest (cron), ad-conversion, ad-refresh-config
3. Tiptap install + editor component + revision UI
4. Comment moderation admin page
5. Video ad + popup + sticky-footer AdSlot variants + A/B + auto-refresh
6. Analytics: cohort, funnel, real-time widget, anomaly
7. Feature flags + audit viewer + CSV exports
```

## Scope callouts

- Big change set (~1 migration, 5 edge functions, ~25 TS files). Migration ships first, needs approval before dependent code typechecks.
- Tiptap adds ~150KB gz; lazy-loaded only in admin editor route.
- Video ads respect `prefers-reduced-motion` (autoplay disabled).
- Auto-refresh caps at 30s minimum to protect CTR integrity.

Approve to fire the migration and start Phase 2, or tell me what to drop.
