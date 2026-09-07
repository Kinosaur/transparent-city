# Plan: Transparent City Site Quality Audit

**Generated**: 2026-09-03
**Estimated complexity**: High

## Overview

Establish a repeatable quality-audit program for Transparent City: first establish a reliable baseline, then test the public dashboard and its data supply chain, remediate confirmed defects, and prevent their return in CI.

This is not a claim that every possible defect can be proved absent. It is a plan to find and prioritize all issues observable through the supported user journeys, supported browsers, data contracts, automated workflow, and deployed production environment.

The immediate high-risk hypothesis is a data regression: the public repository's 2026-08-31 output records only two CSV files (July-August 2026) and 69,230 tickets, whereas the local historical snapshot contains 51 files and 1,225,135 tickets through May 2026. The audit must verify this before trusting any dashboard metric.

## Prerequisites

- A clean worktree and a new audit branch (`codex/site-quality-audit`).
- Access to the public GitHub repository, Actions logs, Vercel deployment logs, and Traffy download credentials/secrets.
- Node version compatible with `frontend/package.json`, Python 3.11, and a fresh virtual environment from `backend/requirements.txt`.
- Browser test environment for Chromium, Firefox, and WebKit; device emulation for mobile.
- An audit artifact location for screenshots, Lighthouse reports, test traces, raw API responses, and failed-data samples.

## Severity and triage policy

- **P0**: incorrect public data, unavailable primary page, data/security exposure, or deployment rollback required.
- **P1**: a primary journey, locale, map, or data-refresh path is materially broken.
- **P2**: misleading presentation, accessibility failure, performance regression, or non-primary functional defect.
- **P3**: cosmetic, copy, or low-impact maintainability issue.

Every finding must have a reproduction, expected versus actual behavior, affected URL/data version/browser, severity, owner, and a regression test before closure.

## Sprint 1: Reproducible baseline and release inventory

**Goal**: Make the repository and the deployment auditable before diagnosing the application.

**Demo/Validation**:

- An audit report identifies the exact local commit, remote commit, Vercel deployment, workflow run, data profile, and dependency versions tested.
- Both backend and frontend verification commands run from a newly created environment.

### Task 1.1: Capture repository and deployment baseline

- **Location**: repository root, `.github/workflows/update-data.yml`, `frontend/package.json`, `backend/requirements.txt`
- **Description**: Record local/remote commit divergence, deployed commit, recent Actions outcomes, Vercel deployment status, runtime versions, lockfile state, and data-file checksums/sizes.
- **Dependencies**: None.
- **Acceptance criteria**:
  - The audit can name the source commit behind every production observation.
  - The local checkout is not mistaken for the deployed application.
- **Validation**: Attach command output and dashboard data profiles to the audit report.

### Task 1.2: Rebuild local test environments

- **Location**: `backend/requirements.txt`, `frontend/package-lock.json`, documentation if commands are wrong.
- **Description**: Create a clean Python 3.11 virtual environment, install pinned backend dependencies, verify `pytest` and `duckdb`, then perform a dependency-locked frontend install.
- **Dependencies**: Task 1.1.
- **Acceptance criteria**:
  - `python -m pytest backend/tests/ -v` starts successfully.
  - `python backend/analysis/explore.py` runs successfully.
  - `npm run lint` and `npm run build` complete with captured output.
- **Validation**: Save test/build logs; treat a hang or missing dependency as a finding with a bounded reproduction.

### Task 1.3: Define test data fixtures and known-good baseline

- **Location**: `frontend/public/data/`, `backend/public/data/`, `backend/tests/`
- **Description**: Preserve a known-good historical Gold-data snapshot and define small, anonymized fixture data for pipeline edge cases.
- **Dependencies**: Task 1.1.
- **Acceptance criteria**:
  - Historical coverage and output-size expectations are explicit, versioned, and reproducible.
  - Tests can run without downloading 2.5 GB of production CSVs.
- **Validation**: Fixture pipeline run matches expected JSON schemas and aggregate assertions.

## Sprint 2: Production user-journey audit

**Goal**: Verify that users can reach, understand, and operate every public page in Thai and English.

**Demo/Validation**:

- A browser-test matrix covers desktop and mobile for `/`, `/th`, `/en`, and every listed feature page.
- Screenshots and traces exist for every failed flow.

### Task 2.1: Routing, locale, and navigation matrix

- **Location**: `frontend/proxy.ts`, `frontend/app/[lang]/layout.tsx`, `frontend/components/Header.tsx`, `frontend/components/MobileNav.tsx`
- **Description**: Test locale redirects, cookie and `Accept-Language` precedence, invalid locales, active navigation, desktop/mobile navigation, language switching, back/forward behavior, and direct deep links.
- **Dependencies**: Sprint 1.
- **Acceptance criteria**:
  - Each intended route resolves once, without loops or unexpected locale changes.
  - Equivalent Thai/English pages retain the selected view and district where applicable.
- **Validation**: Automated browser cases plus manual iOS/Android viewport checks.

### Task 2.2: Overview and district-report workflows

- **Location**: `frontend/app/[lang]/page.tsx`, `frontend/app/[lang]/districts/page.tsx`, `frontend/components/KpiGrid.tsx`, `frontend/components/MonthlyChart.tsx`, `frontend/components/districts/`
- **Description**: Validate KPI arithmetic/display, charts, empty/null values, district selection, query-string deep links, share links, grade explanations, benchmark comparison, and responsive overflow.
- **Dependencies**: Tasks 1.3 and 2.1.
- **Acceptance criteria**:
  - Every visible number maps to the current data JSON without rounding or null-display errors.
  - A district URL produces the correct report and social metadata.
- **Validation**: Compare rendered values with fixture and production JSON; browser snapshots at 320px, 768px, and 1440px.

### Task 2.3: Leaderboard, gallery, map, and social-image workflows

- **Location**: `frontend/app/[lang]/leaderboard/page.tsx`, `frontend/components/leaderboard/`, `frontend/app/[lang]/gallery/page.tsx`, `frontend/components/gallery/`, `frontend/app/[lang]/map/page.tsx`, `frontend/components/map/`, `frontend/app/api/og/route.tsx`
- **Description**: Exercise sorting/filtering, gallery image loading/failure handling, map initialization and teardown, clustering, choropleth metrics, ticket popups, reduced-motion behavior, metadata, and OG-image rate limiting.
- **Dependencies**: Tasks 1.3 and 2.1.
- **Acceptance criteria**:
  - Controls are usable by mouse, touch, and keyboard.
  - Map and gallery do not leave blank, unresponsive, or misleading states when data/photos/tiles fail.
  - OG URLs return valid images and bounded 429 responses under load.
- **Validation**: Browser E2E traces, network-throttled tests, image-response checks, and manual map smoke tests.

## Sprint 3: Data integrity and pipeline reliability

**Goal**: Restore and protect the historical dataset so the dashboard cannot silently publish partial coverage.

**Demo/Validation**:

- A workflow run processes the expected historical range and publishes a verified full-data profile.
- An intentional two-file input fails before it can be committed as the canonical dashboard dataset.

### Task 3.1: Confirm and contain the partial-data regression

- **Location**: `.github/workflows/update-data.yml`, `backend/pipeline/download.py`, `backend/pipeline/validate.py`, `frontend/public/data/data_profile.json`
- **Description**: Compare the current remote data profile to the last known-good historical profile; inspect cache restore/save logs; determine whether cache eviction, a cold cache, download behavior, or another cause reduced inputs to two files. Pause automatic publication if it can overwrite full history again.
- **Dependencies**: Sprint 1.
- **Acceptance criteria**:
  - Root cause is documented with Actions evidence.
  - The last known-good dataset is recoverable and production impact is understood.
- **Validation**: Reproduce the failure path in a disposable cache/test workflow; compare input inventory before/after the run.

### Task 3.2: Add hard input-coverage gates

- **Location**: `backend/pipeline/validate.py`, `backend/tests/test_pipeline_outputs.py`, `.github/workflows/update-data.yml`
- **Description**: Fail the workflow when CSV count, earliest month, continuity, historical ticket count, or Gold output date range falls below explicitly approved thresholds. Make thresholds configurable for fixture tests versus production.
- **Dependencies**: Task 3.1.
- **Acceptance criteria**:
  - Two recent CSVs cannot replace a full historical dashboard.
  - Tests assert a meaningful minimum coverage and detect unexpected data-range shrinkage.
- **Validation**: Negative tests for partial cache, missing month, schema drift, zero-row input, and non-finite JSON values.

### Task 3.3: Redesign data persistence and recovery

- **Location**: `.github/workflows/update-data.yml`, `backend/pipeline/download.py`, repository documentation.
- **Description**: Choose and implement a durable source of history: reliably renewed cache, release artifact/object storage, or a controlled full-redownload fallback. Add a manual recovery workflow and artifact retention policy.
- **Dependencies**: Tasks 3.1 and 3.2.
- **Acceptance criteria**:
  - A cache miss preserves/reconstructs the full expected history.
  - Failed download or validation leaves the last known-good site data untouched.
- **Validation**: Simulate a cold cache, API outage, partial download, and recovery run.

### Task 3.4: Validate analytical claims and methodology

- **Location**: `backend/pipeline/process.py`, `backend/analysis/explore.py`, `backend/README.md`, `README.md`
- **Description**: Recompute dashboard KPIs and six published insights from the canonical Gold data; examine recency bias, stale-ticket clock behavior, grade stability, missing satisfaction ratings, routing-organization semantics, and random sample determinism.
- **Dependencies**: Tasks 3.2 and 3.3.
- **Acceptance criteria**:
  - Published figures, descriptions, and data range agree.
  - Known analytical limitations are visible in the UI or methodology documentation.
- **Validation**: Independent DuckDB queries and reviewable calculation notebook/script output.

## Sprint 4: Automated product quality gates

**Goal**: Turn the audit matrix into fast, reliable regressions checks.

**Demo/Validation**:

- A pull request and scheduled workflow run unit, integration, browser, accessibility, and performance checks with actionable artifacts.

### Task 4.1: Add frontend static, unit, and browser tests

- **Location**: `frontend/` test configuration; route/component test files; GitHub workflow.
- **Description**: Add checks for TypeScript/lint/build, component rendering, locale routing, key user workflows, link/metadata validity, and data-loading error states.
- **Dependencies**: Sprint 2 findings.
- **Acceptance criteria**:
  - Every P0/P1 regression found in Sprint 2 has a deterministic automated test.
  - Tests run against local fixtures and a production smoke target separately.
- **Validation**: Deliberately inject each captured failure and observe test failure.

### Task 4.2: Accessibility audit and remediation

- **Location**: `frontend/app/`, `frontend/components/`, `frontend/app/globals.css`
- **Description**: Run automated and manual WCAG 2.2 AA checks: landmarks, heading order, language attributes, keyboard navigation, focus visibility, touch targets, contrast in both themes, chart/map alternatives, dialogs, and reduced motion.
- **Dependencies**: Sprint 2.
- **Acceptance criteria**:
  - No critical automated accessibility violations on all primary routes.
  - Map/chart data has accessible textual equivalents or clearly documented limits.
- **Validation**: Automated accessibility scans plus keyboard-only and screen-reader smoke tests.

### Task 4.3: Performance, resilience, and security audit

- **Location**: `frontend/next.config.ts`, `frontend/app/api/og/route.tsx`, map/gallery components, deployment configuration.
- **Description**: Measure Core Web Vitals and bundle size; test slow/offline image/tile/API conditions; inspect headers, CSP, dependency vulnerabilities, client-side secrets, API rate-limiting limits in serverless instances, and external-content trust boundaries.
- **Dependencies**: Sprint 2.
- **Acceptance criteria**:
  - Performance budgets are defined for the overview and map.
  - Critical header/dependency/security findings are fixed or explicitly accepted with rationale.
- **Validation**: Lighthouse/Web Vitals reports, network throttling, dependency scan, and deployment-header inspection.

## Sprint 5: Production release and monitoring

**Goal**: Ship only verified data and code, then detect regressions quickly.

**Demo/Validation**:

- A production release has a verified deployment record, data profile, smoke test, and rollback target.

### Task 5.1: Restore verified production data

- **Location**: `frontend/public/data/`, release workflow, Vercel deployment.
- **Description**: Recover the full historical Gold outputs, validate them, deploy them, and confirm that production route data range and dashboards match the release report.
- **Dependencies**: Sprint 3.
- **Acceptance criteria**:
  - Production reports an approved historical coverage window rather than an accidental rolling two-month window.
  - The release includes a data provenance and validation summary.
- **Validation**: Post-deploy smoke suite and before/after data-profile comparison.

### Task 5.2: Add observability and rollback controls

- **Location**: `.github/workflows/update-data.yml`, Vercel configuration/documentation, operations runbook.
- **Description**: Publish workflow summaries/artifacts, alert on failed or suspicious data updates, record deployment health, and document one-command/manual rollback to a known-good JSON version.
- **Dependencies**: Tasks 3.3 and 5.1.
- **Acceptance criteria**:
  - A failed scheduled run creates a visible actionable signal.
  - Operators can restore the last known-good data without rebuilding the frontend.
- **Validation**: Tabletop exercise for API outage, bad data, failed deploy, and rollback.

## Testing strategy

- **Data contracts**: required fields, numeric bounds, reconciliation, exact 50-district coverage, input/output date-range continuity, and historical-volume floor.
- **Pipeline integration**: known small fixtures plus cold-cache, partial-cache, source-outage, and schema-drift scenarios.
- **Frontend**: static checks, component tests, and browser tests across Thai/English, desktop/mobile, normal/slow/error network states.
- **Accessibility**: automated scans plus keyboard, reduced-motion, screen-reader, contrast, and touch-target checks.
- **Production**: independent smoke suite after each Vercel deployment; no production data mutation during exploratory tests.
- **Performance/security**: bundle and Web Vitals budgets, external-resource failure behavior, headers, dependency scanning, and rate-limit verification.

## Potential risks and gotchas

- GitHub Actions cache is not durable storage. A cache miss must not be allowed to redefine the dashboard's historical scope.
- The existing validators can accept a contiguous, current two-month dataset; temporal coverage must be a hard production contract.
- Recent months naturally have lower resolution and zero stale tickets under the 90-day rule. A short window therefore materially distorts rankings and maps, not merely headline volume.
- The map depends on third-party tiles and remote photo URLs; test failures must distinguish application failures from provider/network outages.
- Production may differ from the local checkout. Test reports must always show the commit and data-profile timestamp.
- The OG rate limiter uses process-local memory, which may not provide global limits in a horizontally scaled/serverless deployment.
- Large map and organization payloads can make results device- and network-dependent; do not use only desktop broadband tests.

## Rollback plan

1. Preserve the last verified full historical JSON set as an immutable release artifact.
2. If a data gate fails, do not commit generated `frontend/public/data` outputs or trigger deployment.
3. If a bad data release reaches production, restore the verified JSON revision and redeploy it; record the data profile and incident timeline.
4. If a code release breaks routes or rendering, roll Vercel back to the prior verified deployment, then reproduce against the associated commit and fixture.
