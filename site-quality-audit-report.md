# Transparent City — Site Quality Audit Report

**Audit date**: 2026-09-03 (Asia/Bangkok)
**Scope**: Live production smoke tests, data-pipeline integrity, local quality gates, and targeted source review.
**Status**: Active audit — remediation has not started.

## Executive summary

The public site is available and its primary routes render, but the data supplied to users is critically incomplete. Production currently serves only two months of Traffy data (July-August 2026, 69,230 tickets) instead of the previously published historical series (Sep 2021-May 2026, 1,225,135 tickets). This makes city and district comparisons, trends, grades, stale-ticket reporting, and map defaults materially misleading.

The immediate technical cause is established: the scheduled workflow allows a non-empty but partial CSV cache to pass validation, run the pipeline, and commit its output. The initiating cause of the cache loss has not yet been proven because GitHub restricts the detailed job logs without authentication.

## Environment and evidence

- Local checkout: `1f12678` (2026-06-03), clean except the audit plan/report.
- Remote `main`: `24ecad624a3d65b93cb4f0eeb5f0cbc7c811093d`, an automated data commit from 2026-08-31.
- Latest data workflow: completed successfully in approximately 39 seconds.
- Latest Actions cache: `traffy-csvs-2026-W36`, 21 MB.
- Local recovery inventory: 51 CSVs, Sep 2021-May 2026; approximately 1.2M usable tickets.
- Production URLs tested: `/`, `/th`, `/en`, `/en/districts`, `/en/leaderboard`, `/en/gallery`, `/en/map`, and district OG image endpoint.

## Confirmed findings

### P0 — Production has silently lost historical data

**Evidence**

- Live `data_profile.json` reports `csv_files: 2`, range `2026-07` through `2026-08`, and 69,230 cleaned rows.
- Live `overview.json` reports 69,230 tickets, 50.8% resolution, zero stale tickets, and only two monthly trend points.
- The older local canonical snapshot contains 51 source CSVs, 1,225,135 tickets, data from Sep 2021 through May 2026, 76.7% resolution, and 238,981 stale tickets.
- The scheduled workflow invokes `download.py --months 2` and only gates on whether *any* `bangkok_*.csv` file exists. Its existing validators/tests do not require a historical file count, earliest date, output coverage range, or minimum ticket volume.
- The 2026-08-31 workflow completed successfully and committed the partial JSON dataset.
- This is not merely a missing CI step in theory: `validate.py` emits a sub-100,000 output count only as a warning, and the 37-test output suite accepts any non-empty, chronologically sorted `monthly_trends` list plus `data_range.from <= data_range.to`. Neither path can reject a well-formed two-month snapshot.

**User impact**

- The dashboard claims current citywide performance based on a two-month cohort, not the advertised multi-year record.
- All 50 district grades/rankings are recomputed from two months, so they are not comparable to prior reports.
- A zero stale-ticket count is an artifact of the 90-day definition and the two-month input window.
- Trend, leaderboard, gallery, and map interpretations are not reliable as historical civic-accountability reporting.

**Likely design cause**

GitHub Actions cache is being used as the sole historical-data store. On a cache miss, reset, or partial restore, downloading two current months provides enough files to satisfy the current workflow and overwrites the canonical frontend data.

**Question that must be answered before a repair**

What caused the historical cache to become unavailable or partial: cache eviction/cold start, changed cache key/version, failed save, repository/cache quota, or an earlier manual run? The job-log archive requires authenticated GitHub access, so this cannot be proven from anonymous API data alone.

### P1 — District report presents a non-existent three-month trend as stable

**Evidence**

- Live Chatuchak report at `/th/districts?district=chatuchak` displays “Trend (3 months): stable.”
- The live data supplies only July and August (two months).
- `frontend/components/districts/ReportCard.tsx` returns `stable` whenever fewer than six monthly records exist, while `frontend/dictionaries/*.json` always labels the result as a three-month trend.

**User impact**

The report represents insufficient data as a stable performance conclusion.

### P1 — Map’s default view is silently empty when there are no stale records

**Evidence**

- The live map defaults to the stale-ticket filter.
- The current partial dataset has zero stale points, so it opens with district shading but no ticket markers or explanatory empty state.
- `frontend/components/map/MapClient.tsx` returns early when the visible-point list is empty. The `dict.map.no_results` string exists but is not rendered by the component.

**User impact**

Users see an apparently blank map without being told that the filter yielded no results or that data coverage is only two months.

### P1 — The frontend lint quality gate currently fails

**Evidence**

`npm run lint` fails with five `react-hooks/static-components` errors in `frontend/components/leaderboard/LeaderboardPage.tsx`. The `SortTh` component is declared inside `LeaderboardPage`, creating a new component on render.

**User impact**

The deployed leaderboard works in the tested flow, but the repository cannot pass its stated lint quality gate. This can hide future regressions and should block a clean release process until resolved.

### P2 — Modal and map interactions have accessibility gaps

**Evidence**

- `frontend/components/ShareModal.tsx` renders a visual modal without `role="dialog"`, `aria-modal`, a labelled close button, focus management, focus trap, Escape dismissal, or focus return. The live accessibility snapshot exposes the close button with no accessible name.
- `frontend/components/map/MapClient.tsx` creates marker interactions only through click handlers. The map-marker and popup-close controls lack accessible names and keyboard alternatives. The live snapshot exposes markers as unnamed generic click targets.

**User impact**

Keyboard and assistive-technology users cannot reliably identify, operate, or exit these interactions.

### P2 — Overview KPI progress bars lack accessible names

**Evidence**

An automated axe-core 4.13.0 scan of the live English overview reports three `aria-progressbar-name` violations: the resolution rate, median fix time, and average satisfaction progress bars have `role="progressbar"` but no accessible name. The implementation is in `frontend/components/KpiGrid.tsx`.

**User impact**

Screen-reader users encounter three unnamed progress indicators and cannot associate each value with its metric.

### P2 — Large initial HTML payloads need performance measurement and budgets

**Evidence**

- Production response headers measured approximately 255 KB for Leaderboard, 390 KB for Gallery, and 745 KB for Map initial HTML.
- The leaderboard initially renders 121 agency rows; the map serializes its choropleth and point payload to the client.

**User impact**

Slower networks and mobile devices may experience delayed first render and expensive hydration. This requires Lighthouse/Web Vitals measurement before assigning a stricter severity.

## Checks that passed

- All six primary production routes returned HTTP 200. `/` correctly redirects to `/th` for the tested request.
- Production sends a CSP, HSTS, `X-Content-Type-Options`, frame denial, COOP, referrer policy, and restrictive permissions policy.
- English/Thai navigation and language switching worked in browser testing.
- District selection, canonical query-string deep link, title/metadata, share preview, and OG image endpoint worked.
- Leaderboard search and sorting worked in the live browser session.
- Gallery cards, images, filters, and before/after flip controls rendered.
- Map controls and low-satisfaction markers rendered.
- The live English overview was scanned with axe-core; it exposed the three unnamed KPI progress bars above.
- Local backend data-contract suite: **37 passed**. This result is insufficient to establish historical coverage because the suite lacks coverage assertions.
- Local backend analysis executed successfully against the historical Gold outputs.
- `npm run build` passes outside the sandbox. The sandbox-only build hang was caused by unavailable external network access during Next font handling, not a demonstrated production build failure.

## Data-quality observations

- The local raw recovery set has six early series gaps (`2021-11`, `2021-12`, `2022-02`, `2022-03`, `2022-05`, `2022-06`) and is four months behind the audit date (latest `2026-05`).
- The local raw data can restore the historical baseline, but newer months must be safely added before publishing a refreshed full range.
- Local standalone input validation reports the missing early months and stale local data, correctly failing. The production workflow’s partial two-month set is still accepted because its current rules permit it.

## Recommended next actions

1. **Contain production data risk**: pause automated data commits or add a temporary minimum-history guard before the next scheduled run.
2. **Authenticate to inspect Actions logs**: determine why the historical cache was lost before choosing retention/recovery architecture.
3. **Recover and validate data**: regenerate the full historical JSON from the local 51 CSVs, acquire newer monthly files, and validate a complete date range before deployment.
4. **Make coverage a data contract**: fail CI when CSV count, earliest date, continuity, output date range, or ticket total unexpectedly shrinks.
5. **Fix user-facing partial-data states**: report insufficient trend history and show an explicit map empty state with data-coverage context.
6. **Repair the lint error and accessibility gaps**, then add browser, accessibility, and performance regression checks.

## Audit limitations

- Detailed GitHub Actions logs could not be downloaded anonymously (HTTP 403); cache-root-cause evidence is incomplete.
- Cross-browser, mobile-device, screen-reader, and Lighthouse measurements have not yet run. A parallel multi-route axe scan was rejected by the execution-approval service before it ran; it has not been retried.
- No production mutation, data restoration, workflow edit, or application-code change has been performed during this audit.

## Required data-contract acceptance criteria

The next pipeline/CI design should make a historical-data replacement impossible unless an operator explicitly approves it. At minimum, an automated run must fail when any of the following is true:

- the raw month inventory drops below an agreed baseline or loses a previously published month;
- the earliest raw and output month move forward unexpectedly;
- a month within the tracked range is missing (with any documented legacy exceptions handled explicitly rather than silently);
- `overview.monthly_trends` is shorter than the minimum history required by the UI's trend claims;
- the total-ticket count falls materially below the last published baseline, allowing only a documented, reviewed correction; or
- a download/cache failure leaves the job without a durable canonical raw-data source.

The thresholds and exception policy are a product/data-owner decision. The current facts support enforcing a regression baseline of roughly 1.2 million tickets and September 2021 as the earliest retained month once the recovery data is reconciled with newer months.
