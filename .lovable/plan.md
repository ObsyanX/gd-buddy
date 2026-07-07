# GD Buddy — Admin Analytics + Article CMS + Ad System (Phase 1)

You picked "all three in parallel, thin slice each." This plan ships a **production-quality vertical slice** of each system: real tables + RLS + GRANTs, real admin CRUD, real tracking, and one wired-up consumer surface per system. Deeper targeting/rich-text/heavy charts follow in phase 2. AI-feedback Groq fallback is already live in `_shared/ai-with-fallback.ts` — no work needed there.

## Scope of Phase 1

### A. Analytics foundation

- New tables: `page_views`, `visitor_sessions`, `login_events`, `analytics_daily` (rollup).
- Edge function `track-event` (verify_jwt=false, anon-writable via service role) accepting `{type, path, referrer, user_id?}`; parses UA → device/browser/OS, records anon `visitor_id` cookie value forwarded from client.
- Edge function `analytics-rollup` (scheduled daily via `pg_cron` + `pg_net`) that upserts into `analytics_daily`.
- Client `useTracker()` hook fires `page_view` on every route change + `login_success/login_failed` on Auth.
- `/admin/analytics` page: KPI cards (Users, Auth, Traffic, Engagement, Interview, Content, Ads, System, Conversion, Revenue) + charts (Recharts already in project via existing chart-theme):
  - Daily signups, User growth, Traffic, Session trend, Revenue, Article views, Ad performance, Device / Browser / Country distribution.
- All KPIs read from the new tables + existing `gd_sessions`, `gd_metrics`, `error_logs`, `token_usage`, `ai_costs`, `user_feedback`.

### B. Article CMS (Markdown + preview)

- New tables: `article_categories`, `article_tags`, `articles`, `article_tag_map`, `article_comments`, `article_likes`.
- Admin `/admin/articles` list (search / filter / sort / paginate) + `/admin/articles/new` and `/admin/articles/:id/edit` with:
  - Title, slug (auto), category, author (auto = current admin), featured image (Supabase Storage bucket `article-media`), thumbnail, summary, SEO title/desc/keywords, tags multiselect, Markdown body with live preview (`react-markdown` + syntax highlight), status (draft/scheduled/published), publish_at, related_articles.
  - Auto: reading_time (word count / 200), TOC generation from H2/H3, view/like/share/comment counts.
- Public `/blog` (list, category filter) + `/blog/:slug` (hero image, meta, TOC, body, callouts, code blocks, related, share, prev/next, ad slots, newsletter CTA, comments).
- SEO: `<SEOHead>` per article (title, description, canonical, og, twitter, JSON-LD Article).
- Categories seeded: Interview Tips, Group Discussion, HR Questions, Technical, Java, React, Node.js, System Design, Resume, Aptitude, Communication, Career, Placement, Behavioral, Coding.

### C. Advertisement system (full targeting matrix)

- New tables: `ad_campaigns`, `advertisements`, `ad_impressions`, `ad_clicks`, `newsletter_subscribers`.
- Admin `/admin/ads` + `/admin/ads/new|:id/edit` with every field from spec: title, advertiser, image (Storage bucket `ad-media`), destination URL, CTA, description, start/end date, priority, status, budget, campaign, UTM (auto-appended on click redirect), locations (multi), countries (multi), OS/browsers/devices (multi), max views, max clicks, weight, frequency cap, rotation strategy (random/weighted/sequential/priority).
- `ad_campaigns` admin page for grouping.
- Client `<AdSlot placement="landing.hero_bottom" />` component:
  - Queries active + in-window ads matching current placement, device (UA), country (edge function returns from CF headers), OS, browser.
  - Applies rotation strategy + frequency cap (localStorage per visitor_id).
  - Lazy-loads via IntersectionObserver.
  - Dark-mode aware image src.
  - Records impression on view (debounced 1s) and click on redirect.
  - Auto-hides when max_views/max_clicks/end_date reached (also enforced by edge function `ad-serve`).
- Placement wiring in phase 1:
  - Landing: hero bottom, features section, footer.
  - Blog list: between cards, sidebar, top banner.
  - Article page: after first section, middle, before related.
  - Dashboard: sidebar, below stats, bottom.
  - Session report (`/session/:id/report`): after AI feedback, before recommendations.
- Explicit block list (component refuses to render): Login, Signup, Payment, live GD room, live AI interview, voice/camera/screen-share, evaluation loading, checkout. Enforced by placement whitelist in the component.

### D. Admin panel navigation

- Extend existing `/admin` (guarded by `AdminGuard`) with left nav:
  - Dashboard · Users · Articles · Categories · Tags · Advertisements · Campaigns · Analytics · Comments · Newsletter · Reports · Settings.
- Users page = existing profile/role management, extended with search/pagination.
- Reports = CSV export of key tables.
- Settings = feature flags in a new `admin_settings` KV table.

### E. Security / infra

- All new tables: `authenticated` + `service_role` GRANTs, RLS on. Admin-only write via `has_role(auth.uid(),'admin')`. Public read only for `articles` where `status='published' AND publish_at <= now()`, `article_categories`, `article_tags`, and `advertisements` where active window.
- `page_views` / `ad_impressions` / `ad_clicks` / `login_events`: insert via `service_role` from edge functions only, `authenticated` cannot write directly. Admin can read.
- All edge functions: zod input validation, CORS, structured logs.
- Audit logs written to existing `audit_events` on every admin mutation.

### F. Explicit out-of-scope for Phase 1 (queued for Phase 2)

- Rich-text/Tiptap editor (Markdown ships now).
- Video ads + popup ads (banner/sidebar/native/card/inline/sticky-footer ship now).
- Affiliate links table + revenue attribution beyond aggregates.
- Comment moderation queue UI (comments stored + read-only in admin).
- Full A/B experiment plumbing for ads (weighted rotation ships now).
- Auto-refresh ads (lazy + view/click tracking ships now).

## Delivery order (single response, batched)

1. **Migration 1** — analytics tables + RLS + GRANTs + rollup function.
2. **Migration 2** — article CMS tables + seed categories + storage bucket policies.
3. **Migration 3** — ad tables + storage bucket policies.
4. **Edge functions** — `track-event`, `ad-serve`, `ad-click`, `analytics-rollup`, `article-publish-scheduler`.
5. **Storage buckets** — `article-media`, `ad-media` (public read, admin write).
6. **Client code** — `useTracker`, `<AdSlot>`, admin pages, blog pages, wired placements.
7. **Cron** — daily `analytics-rollup` + minute-ly ad-window sweep.

## Technical notes

```text
tracker flow
  route change ─▶ useTracker ─▶ /track-event ─▶ page_views + visitor_sessions
  auth change  ─▶ useTracker ─▶ /track-event(login_success|login_failed) ─▶ login_events

ad flow
  <AdSlot placement="landing.hero_bottom" />
    │
    ├─ /ad-serve?placement=…&device=…&country=… ─▶ picks 1 ad by rotation + cap
    ├─ IntersectionObserver ≥1s ─▶ /ad-serve/impression
    └─ onClick ─▶ /ad-click?id=… ─▶ 302 to destination + UTM

article publish
  status='scheduled' AND publish_at <= now()
    └─ minute-ly cron ─▶ article-publish-scheduler ─▶ status='published'
```

- Charts reuse `src/components/charts/*` (MetricArea, Sparkline, ScoreRadar, StatCard) — no new chart lib.
- `useTracker` uses `sendBeacon` when available so nav-away doesn't drop events.
- `<AdSlot>` reads `useReducedMotion` + `prefers-color-scheme` for dark asset variant.
- Groq fallback for AI feedback: **already implemented**, no action.

You picked "all three in parallel, thin slice each." This plan ships a **production-quality vertical slice** of each system: real tables + RLS + GRANTs, real admin CRUD, real tracking, and one wired-up consumer surface per system. Deeper targeting/rich-text/heavy charts follow in phase 2. AI-feedback Groq fallback is already live in `_shared/ai-with-fallback.ts` — no work needed there.

## Scope of Phase 1

### A. Analytics foundation

- New tables: `page_views`, `visitor_sessions`, `login_events`, `analytics_daily` (rollup).
- Edge function `track-event` (verify_jwt=false, anon-writable via service role) accepting `{type, path, referrer, user_id?}`; parses UA → device/browser/OS, records anon `visitor_id` cookie value forwarded from client.
- Edge function `analytics-rollup` (scheduled daily via `pg_cron` + `pg_net`) that upserts into `analytics_daily`.
- Client `useTracker()` hook fires `page_view` on every route change + `login_success/login_failed` on Auth.
- `/admin/analytics` page: KPI cards (Users, Auth, Traffic, Engagement, Interview, Content, Ads, System, Conversion, Revenue) + charts (Recharts already in project via existing chart-theme):
  - Daily signups, User growth, Traffic, Session trend, Revenue, Article views, Ad performance, Device / Browser / Country distribution.
- All KPIs read from the new tables + existing `gd_sessions`, `gd_metrics`, `error_logs`, `token_usage`, `ai_costs`, `user_feedback`.

### B. Article CMS (Markdown + preview)

- New tables: `article_categories`, `article_tags`, `articles`, `article_tag_map`, `article_comments`, `article_likes`.
- Admin `/admin/articles` list (search / filter / sort / paginate) + `/admin/articles/new` and `/admin/articles/:id/edit` with:
  - Title, slug (auto), category, author (auto = current admin), featured image (Supabase Storage bucket `article-media`), thumbnail, summary, SEO title/desc/keywords, tags multiselect, Markdown body with live preview (`react-markdown` + syntax highlight), status (draft/scheduled/published), publish_at, related_articles.
  - Auto: reading_time (word count / 200), TOC generation from H2/H3, view/like/share/comment counts.
- Public `/blog` (list, category filter) + `/blog/:slug` (hero image, meta, TOC, body, callouts, code blocks, related, share, prev/next, ad slots, newsletter CTA, comments).
- SEO: `<SEOHead>` per article (title, description, canonical, og, twitter, JSON-LD Article).
- Categories seeded: Interview Tips, Group Discussion, HR Questions, Technical, Java, React, Node.js, System Design, Resume, Aptitude, Communication, Career, Placement, Behavioral, Coding.

### C. Advertisement system (full targeting matrix)

- New tables: `ad_campaigns`, `advertisements`, `ad_impressions`, `ad_clicks`, `newsletter_subscribers`.
- Admin `/admin/ads` + `/admin/ads/new|:id/edit` with every field from spec: title, advertiser, image (Storage bucket `ad-media`), destination URL, CTA, description, start/end date, priority, status, budget, campaign, UTM (auto-appended on click redirect), locations (multi), countries (multi), OS/browsers/devices (multi), max views, max clicks, weight, frequency cap, rotation strategy (random/weighted/sequential/priority).
- `ad_campaigns` admin page for grouping.
- Client `<AdSlot placement="landing.hero_bottom" />` component:
  - Queries active + in-window ads matching current placement, device (UA), country (edge function returns from CF headers), OS, browser.
  - Applies rotation strategy + frequency cap (localStorage per visitor_id).
  - Lazy-loads via IntersectionObserver.
  - Dark-mode aware image src.
  - Records impression on view (debounced 1s) and click on redirect.
  - Auto-hides when max_views/max_clicks/end_date reached (also enforced by edge function `ad-serve`).
- Placement wiring in phase 1:
  - Landing: hero bottom, features section, footer.
  - Blog list: between cards, sidebar, top banner.
  - Article page: after first section, middle, before related.
  - Dashboard: sidebar, below stats, bottom.
  - Session report (`/session/:id/report`): after AI feedback, before recommendations.
- Explicit block list (component refuses to render): Login, Signup, Payment, live GD room, live AI interview, voice/camera/screen-share, evaluation loading, checkout. Enforced by placement whitelist in the component.

### D. Admin panel navigation

- Extend existing `/admin` (guarded by `AdminGuard`) with left nav:
  - Dashboard · Users · Articles · Categories · Tags · Advertisements · Campaigns · Analytics · Comments · Newsletter · Reports · Settings.
- Users page = existing profile/role management, extended with search/pagination.
- Reports = CSV export of key tables.
- Settings = feature flags in a new `admin_settings` KV table.

### E. Security / infra

- All new tables: `authenticated` + `service_role` GRANTs, RLS on. Admin-only write via `has_role(auth.uid(),'admin')`. Public read only for `articles` where `status='published' AND publish_at <= now()`, `article_categories`, `article_tags`, and `advertisements` where active window.
- `page_views` / `ad_impressions` / `ad_clicks` / `login_events`: insert via `service_role` from edge functions only, `authenticated` cannot write directly. Admin can read.
- All edge functions: zod input validation, CORS, structured logs.
- Audit logs written to existing `audit_events` on every admin mutation.

### F. Explicit out-of-scope for Phase 1 (queued for Phase 2)

- Rich-text/Tiptap editor (Markdown ships now).
- Video ads + popup ads (banner/sidebar/native/card/inline/sticky-footer ship now).
- Affiliate links table + revenue attribution beyond aggregates.
- Comment moderation queue UI (comments stored + read-only in admin).
- Full A/B experiment plumbing for ads (weighted rotation ships now).
- Auto-refresh ads (lazy + view/click tracking ships now).

## Delivery order (single response, batched)

1. **Migration 1** — analytics tables + RLS + GRANTs + rollup function.
2. **Migration 2** — article CMS tables + seed categories + storage bucket policies.
3. **Migration 3** — ad tables + storage bucket policies.
4. **Edge functions** — `track-event`, `ad-serve`, `ad-click`, `analytics-rollup`, `article-publish-scheduler`.
5. **Storage buckets** — `article-media`, `ad-media` (public read, admin write).
6. **Client code** — `useTracker`, `<AdSlot>`, admin pages, blog pages, wired placements.
7. **Cron** — daily `analytics-rollup` + minute-ly ad-window sweep.

## Technical notes

```text
tracker flow
  route change ─▶ useTracker ─▶ /track-event ─▶ page_views + visitor_sessions
  auth change  ─▶ useTracker ─▶ /track-event(login_success|login_failed) ─▶ login_events

ad flow
  <AdSlot placement="landing.hero_bottom" />
    │
    ├─ /ad-serve?placement=…&device=…&country=… ─▶ picks 1 ad by rotation + cap
    ├─ IntersectionObserver ≥1s ─▶ /ad-serve/impression
    └─ onClick ─▶ /ad-click?id=… ─▶ 302 to destination + UTM

article publish
  status='scheduled' AND publish_at <= now()
    └─ minute-ly cron ─▶ article-publish-scheduler ─▶ status='published'
```

- Charts reuse `src/components/charts/*` (MetricArea, Sparkline, ScoreRadar, StatCard) — no new chart lib.
- `useTracker` uses `sendBeacon` when available so nav-away doesn't drop events.
- `<AdSlot>` reads `useReducedMotion` + `prefers-color-scheme` for dark asset variant.
- Groq fallback for AI feedback: **already implemented**, no action.

## Risk / callout

- This is still ~15 files of migration + ~30 files of TS. I'll ship it in one batched response, but the migration tool runs three separate migrations that each need your approval before code that reads them will typecheck. If you approve the plan I'll fire them in order.
- Phase 2 (rich text, video ads, affiliate revenue, A/B) needs a follow-up request.

Approve to proceed, or tell me what to cut/add.

## Risk / callout

- This is still ~15 files of migration + ~30 files of TS. I'll ship it in one batched response, but the migration tool runs three separate migrations that each need your approval before code that reads them will typecheck. If you approve the plan I'll fire them in order.
- Phase 2 (rich text, video ads, affiliate revenue, A/B) needs a follow-up request.

Approve to proceed, or tell me what to cut/add.