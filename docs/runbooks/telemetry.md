# Telemetry runbook — RUM sampling & pruning

Both subsystems are controlled at runtime through `admin_settings` flags, editable
without a deploy at **Admin → Telemetry** (`/home/admin/telemetry`).

## Flags

| Key | Type | Default | Effect |
| --- | --- | --- | --- |
| `telemetry.prune_enabled` | boolean | `true` | `false` ⇒ nightly job logs a *skipped* run and deletes nothing |
| `telemetry.prune_dry_run` | boolean | `false` | `true` ⇒ nightly job only counts rows it *would* delete |
| `telemetry.rum_sampling_enabled` | boolean | `true` | `false` ⇒ 100% of visitors' vitals recorded (rollback) |
| `telemetry.rum_sample_rate` | number 0–1 | `0.25` | fraction of visitors sampled in (deterministic per visitor) |
| `telemetry.rum_calibration_until` | ISO string / null | `null` | while in the future, every event is stored but tagged `in_sample` |
| `telemetry.alert_max_prune_ms` | number | `30000` | prune duration alert budget |
| `telemetry.alert_max_rows_24h` | number | `20000` | web-vitals volume alert budget |
| `telemetry.alert_max_error_rate` | number | `2` | client error-rate alert budget (% of page views) |

## Rollback procedures

**RUM sampling looks wrong** → toggle *RUM sampling enabled* off. Next page load,
every visitor reports all vitals again (`sample_rate = 1`, `in_sample = true`).
No historical data is affected. Re-enable by toggling on and setting the rate.

**Pruning looks wrong** → toggle *Telemetry pruning enabled* off. The nightly cron
still fires but immediately records a skipped run and performs no deletes.
Deletes are irreversible, so validate with *Force dry-run mode* before re-enabling.

## Dry-run / staging validation

Press **Dry run prune** (or call `telemetry_prune_dry_run()` as an admin). It returns
and logs a per-table count of rows that *would* be removed, without deleting anything.
Setting `telemetry.prune_dry_run = true` puts the scheduled job into the same mode.

## Safety guarantees in `prune_telemetry_data()`

* Deletes are restricted to a hard-coded allowlist of nine telemetry tables:
  `web_vitals_events`, `page_views`, `visitor_sessions`, `error_logs`, `perf_events`,
  `response_cache`, `ad_impressions`, `background_jobs`, `pagespeed_reports`.
* The function raises and aborts if the allowlist ever intersects the protected set
  (sessions, messages, participants, metrics, profiles, roles, feedback, articles,
  comments, notifications, login/audit events, subscribers, personas).
* It raises if any allowlisted table does not exist in `public`.
* Every run is recorded in `telemetry_prune_runs` (mode, trigger, duration, per-table
  counts, error message). Failures roll the run row forward with the error and re-raise.

## Sampling accuracy verification

1. Set `telemetry.rum_calibration_until` to an ISO timestamp a few days out.
   The client then records **all** events, tagging each with the sample decision it
   would have had.
2. Weekly cron (`rum-sampling-check-weekly`, Mondays 04:00 UTC) runs
   `run_rum_sampling_check(168)`, writing p75 for the full population vs the sampled
   subset per metric into `rum_sampling_checks`, with a delta %.
3. The Telemetry dashboard flags any metric drifting more than ±10%.
   Press **Run sampling check** to compute one on demand.
4. Clear the calibration flag when the window closes.
