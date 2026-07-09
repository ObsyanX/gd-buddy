# Phase 3 — Governance & Scale

Phase 2 shipped rich CMS, video/popup ads, comment moderation, newsletter, revenue tracking, feature flags. Phase 3 hardens the platform for multi-tenant operations and compliance.

**Phases remaining after this: 1** (Phase 4 = Intelligence layer: AI article assistant, AI ad copy, anomaly detection, predictive CTR, recommendation engine).

## Deliverables

### A. Multi-tenant admin roles
- Extend `app_role` enum with `editor` and `analyst` (admin already exists).
- Update RLS on articles/comments/ads/analytics so:
  - `editor` — full CRUD on articles, tags, categories, comments; read-only on ads/analytics.
  - `analyst` — read-only on analytics, articles, ads; no writes.
  - `admin` — unchanged (full control).
- `/home/admin/users` gets role assignment dropdown (admin-only; email allowlist still gates `admin`).
- `AdminGuard` becomes `RoleGuard` accepting allowed roles; sidebar hides items per role.

### B. Scheduled reports (weekly digest)
- New edge function `newsletter-digest` (cron via `pg_cron` + `pg_net`, Mondays 08:00 UTC).
- Pulls top KPIs from `analytics_daily` last 7d + top articles + top ads.
- Sends via existing newsletter infra to subscribers with `digest_opt_in=true` (new column).
- Admin preview page `/home/admin/reports/digest` — render the same HTML, "Send now" button.

### C. Ad revenue attribution
- New table `ad_revenue_events` (ad_id, advertiser_id, amount_cents, source `impression|click|conversion`, occurred_at).
- Rollup trigger updates `analytics_daily.ad_revenue_cents` and per-ad `revenue_cents`.
- `/home/admin/campaigns` gains revenue column + CSV export by advertiser.

### D. GDPR export & delete
- Wrap existing `export_user_data` / `delete_user_data` RPCs into `/home/settings/privacy` panel.
- Buttons: "Download my data" (JSON), "Delete my account". Delete cascades sessions, messages, feedback, article likes/comments (author preserved as anonymized).
- Admin can trigger from `/home/admin/users/:id` with audit trail.

### E. i18n article variants
- New table `article_translations` (article_id, locale, title, excerpt, body_md, body_html, seo_title, seo_description, status).
- Article editor gets locale tabs (en/hi/es matching `src/i18n`).
- Public `/blog/:slug` picks translation matching `getLocale()`, falls back to source.

### F. Cross-cutting
- Audit events for role changes, GDPR actions, digest sends.
- Feature flags: `reports.digest_enabled`, `articles.i18n_enabled`, `roles.editor_analyst_enabled`.

## Delivery order

```text
1. Migration — app_role enum extend, article_translations, ad_revenue_events, digest_opt_in, updated RLS
2. RoleGuard + role-aware sidebar + AdminUsers role assignment UI
3. Privacy panel (settings) + admin user detail delete/export
4. ad_revenue_events rollup + campaigns revenue UI
5. newsletter-digest edge function + cron + preview page
6. Article translations UI + public blog locale switch
7. Audit + feature flag wiring
```

## Scope callouts

- Migration is the gating step (enum change + RLS rewrites); needs approval before dependent code compiles.
- No third-party i18n libs — reuses existing `src/i18n` catalog.
- Digest email uses existing newsletter transport (no new provider).
- Editor/analyst roles do NOT get the `admin` allowlist bypass — only `admin` still restricted to the authorized email.

Approve to fire the Phase 3 migration.
