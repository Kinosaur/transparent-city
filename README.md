# เมืองโปร่งใส — Transparent City Bangkok

**End-to-end civic data platform — from 51 raw CSVs to a live public dashboard.**

> เพราะเมืองที่ดี ต้องเริ่มจากการตั้งคำถามที่ถูก
> *A better city starts with asking the right questions.*

[![Live Site](https://img.shields.io/badge/Live%20Site-transparent--city.vercel.app-2dd4bf?style=flat-square&logo=vercel&logoColor=white)](https://transparent-city.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-2dd4bf?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![DuckDB](https://img.shields.io/badge/DuckDB-1.2-FFC107?style=flat-square)](https://duckdb.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

[![Preview](https://transparent-city.vercel.app/api/og?page=overview&lang=en)](https://transparent-city.vercel.app/en)

---

## What This Is

1,225,135 civic complaint tickets. 50 Bangkok districts. One transparent dashboard.

Transparent City ingests [Traffy Fondue](https://www.traffy.in.th/) open data — Bangkok's LINE-based civic reporting platform — and turns it into a public accountability tool. Citizens can see which districts fix problems fastest, which agencies are falling behind, and which neighbourhoods have complaints sitting unresolved for months.

Available in **Thai 🇹🇭** and **English 🇬🇧**.

---

## Data at a Glance

| Metric | Value |
|--------|-------|
| Total tickets | **1,225,135** |
| Resolved | **939,439 (76.7%)** |
| Stale (90+ days inactive) | **238,981 (19.5%)** |
| Median resolution time | **5.2 days** |
| Average satisfaction | **3.99 / 5.0** |
| Districts tracked | **50** |
| Routing organisations | **~12,500** |
| Dataset range | **Sep 2021 → May 2026** |
| Raw data size | **~2.5 GB (51 CSVs)** |

---

## Skills Demonstrated

This is a portfolio project built to demonstrate a full data engineering and frontend stack.

### Data Engineering
- **Medallion architecture** — Bronze (raw CSVs) → Silver (cleaned pandas DataFrame) → Gold (DuckDB SQL aggregations → JSON)
- **In-process SQL analytics** — DuckDB window functions (`ROW_NUMBER`, `CORR`, `MEDIAN`, `QUALIFY`), CTEs, and unnest over 1.2M rows in under a second
- **Data quality** — schema validation on ingest, `nan_to_none` guard on all JSON serialisation, pytest suite treating outputs as data contracts
- **Pipeline automation** — GitHub Actions weekly cron with CSV caching, graceful API-unavailability fallback, and a rich job summary UI
- **Exploratory analysis** — 6 SQL-driven findings on the dataset (district momentum, recency bias trap, seasonal peaks, stale hotspot clustering, satisfaction vs speed correlation)

### Frontend / Full-Stack
- **Next.js 16 App Router** with TypeScript, Tailwind v4, and `[lang]` locale routing (TH / EN)
- **Dynamic OG images** — per-district social preview cards generated server-side via `app/api/og`
- **Recharts + Leaflet** — interactive monthly trend charts, district choropleth, and clustered map points
- **Accessibility** — WCAG AA contrast across light/dark modes, `prefers-reduced-motion`, aria attributes, keyboard navigation
- **Static deployment** — pre-rendered JSON served from `public/data/` via Vercel; no database or backend server needed

### Analytical Thinking
- Identified the **recency bias trap** in monthly resolution rates (2022 looks like ~90%, 2026 looks like ~60% — it's a data artefact, not platform decline)
- Built a **district momentum** metric: 6-month resolution rate change vs the prior 6 months reveals grade-C districts quietly sliding toward grade-D
- **Pearson r = −0.41** between median resolution days and citizen satisfaction across all 50 districts

---

## Pages

| Page | URL | What it shows |
|------|-----|---------------|
| **Overview** | `/en` | City-wide KPIs, monthly trend chart, top 10 problem types |
| **Districts** | `/en/districts` | Per-district report cards — A–F grade, resolution rate, stale tickets, benchmark bars |
| **Rankings** | `/en/leaderboard` | Agency leaderboard — sortable by resolution rate, speed, satisfaction, reopen rate |
| **Gallery** | `/en/gallery` | Before/after photo pairs of resolved civic issues |
| **Map** | `/en/map` | Stale ticket clusters, low-satisfaction hotspots, district choropleth |

Every district card is **deep-linkable** — `/en/districts?district=chatuchak` loads Chatuchak's card with its own social preview image.

---

## Pipeline Architecture

```
Traffy Fondue Public API  (publicapi.traffy.in.th)
         │
         │  download.py  (~51 monthly CSVs, Sep 2021 → present)
         ▼
┌─────────────────────────────────────────────────────┐
│  BRONZE — Raw Storage                               │
│  backend/data/bangkok_YYYY-MM.csv  (~2.5 GB total)  │
│  manifest.json  (download audit trail)              │
└─────────────────────────────────────────────────────┘
         │  process.py  — pandas
         ▼
┌─────────────────────────────────────────────────────┐
│  SILVER — Cleaned & Enriched DataFrame              │
│  • Dedup on ticket_id                               │
│  • Coord parsing ("lon,lat" string → float)         │
│  • Timestamp normalisation                          │
│  • Bangkok-only allowlist filter                    │
│  • Derived flags: is_resolved, is_stale,            │
│    resolution_days, days_open, ym                   │
└─────────────────────────────────────────────────────┘
         │  process.py  — DuckDB SQL
         ▼
┌─────────────────────────────────────────────────────┐
│  GOLD — Aggregated JSON Outputs                     │
│  overview.json      · districts.json                │
│  orgs.json          · gallery.json                  │
│  points.json        · data_profile.json             │
└─────────────────────────────────────────────────────┘
         │  git commit + push → Vercel auto-deploy
         ▼
    transparent-city.vercel.app
```

See [`backend/README.md`](backend/README.md) for the full schema, grading algorithm, SQL patterns, and data quirks.

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Framework | Next.js 16 (App Router) | Static-first, locale routing, server-side OG images |
| Language | TypeScript | End-to-end type safety across components and data shapes |
| Styling | Tailwind CSS v4 | CSS custom properties + `@theme inline` for semantic design tokens |
| Charts | Recharts | Composable React chart primitives |
| Mapping | Leaflet + react-leaflet-cluster | Clusters 25k map points without janking the browser |
| i18n | Native `[lang]` routing | TH / EN with dictionary files; no extra library needed |
| ETL | Python + pandas | Best for row-level transforms and timestamp/coordinate parsing |
| Analytics SQL | DuckDB | In-process SQL; window functions on 1.2M rows in <1s, no server needed |
| Testing | pytest | Treats Gold JSON outputs as data contracts |
| CI/CD | GitHub Actions | Weekly cron + CSV cache + auto-deploy on data change |
| Hosting | Vercel | Zero-config deploys on push |

---

## Exploratory Analysis

`backend/analysis/explore.py` runs six DuckDB analyses directly on the Gold JSON files — no raw CSVs or database server needed.

```bash
python backend/analysis/explore.py
```

**Key findings:**

1. **District Momentum** — Pathum Wan (grade F) lost another 18 pp in 6 months; Chom Thong and Don Mueang (grade C) are quietly sliding toward D. Grade snapshots miss trend direction.
2. **Speed predicts satisfaction** — Pearson r = −0.41 across all 50 districts; faster districts score higher, but speed alone isn't sufficient.
3. **Stale hotspots** — Bang Phlat lets 1 in 3 open tickets go dark for 90+ days. Khlong Toei has a 1-in-4 stale rate despite a grade C — because grades are built on resolution rate, not ticket age.
4. **March consistently peaks** — 49,247 tickets in March 2025 vs a 28,468 monthly average; aligns with end of dry season and pre-monsoon infrastructure stress.
5. **Recency bias trap** — 2022 shows ~90% resolution, 2026 shows ~60%. Not platform failure — a Jul 2022 ticket has had 3+ years to resolve; a May 2026 ticket has had days. Cohort analysis is the fix.
6. **Agency scale ≠ speed** — r = −0.076 for volume vs median days; bigger agencies are no faster. A 2×2 quadrant reveals a "star" cluster of high-rate, fast agencies.

See [`backend/analysis/README.md`](backend/analysis/README.md) for full findings and SQL patterns.

---

## Project Structure

```
.
├── backend/
│   ├── pipeline/
│   │   ├── download.py          # Fetch monthly CSVs from Traffy API
│   │   ├── process.py           # Bronze → Silver (pandas) → Gold (DuckDB) → JSON
│   │   ├── validate.py          # Schema + quality checks (standalone)
│   │   └── download_geojson.py  # One-time Bangkok district boundary download
│   ├── analysis/
│   │   ├── explore.py           # 6 DuckDB analyses on Gold outputs
│   │   └── README.md            # Key findings + SQL patterns
│   ├── tests/
│   │   └── test_pipeline_outputs.py  # pytest data-contract tests
│   ├── data/                    # Raw CSVs — gitignored (~2.5 GB)
│   ├── public/data/             # Pipeline outputs — intermediate
│   ├── README.md                # Pipeline deep-dive (schema, grading, SQL patterns)
│   └── requirements.txt
│
├── frontend/                    # Next.js 16 app
│   ├── app/[lang]/              # Locale-aware routes (/th, /en)
│   ├── app/api/og/              # Dynamic OG image generation (per-district)
│   ├── components/              # React components — fully typed
│   │   ├── KpiGrid.tsx          # Animated KPI cards with progress bars
│   │   ├── MonthlyChart.tsx     # Resolution trend chart
│   │   ├── districts/           # District report card + deep-link modal
│   │   └── leaderboard/         # Sortable agency table with inline bars
│   ├── dictionaries/            # th.json + en.json translation strings
│   ├── lib/                     # Shared types, utilities, district name maps
│   └── public/data/             # Gold JSON outputs — committed to git ✓
│       ├── overview.json
│       ├── districts.json
│       ├── orgs.json
│       ├── gallery.json
│       ├── points.json
│       ├── monthly_trends.json
│       └── bangkok-districts.geojson
│
└── .github/workflows/
    └── update-data.yml          # Weekly cron: download → validate → pipeline
                                 #              → pytest → commit → Vercel deploy
```

---

## Local Setup

### Backend (data pipeline)

```bash
# 1. Create virtual environment
python3 -m venv .venv && source .venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Download all historical CSVs (one-time, ~51 files, ~2.5 GB)
export TRAFFY_NAME="Your Name"
export TRAFFY_EMAIL="you@example.com"
export TRAFFY_ORG="Your Organisation"
export TRAFFY_PURPOSE="research"
python backend/pipeline/download.py --all

# 4. Run pipeline → generates Gold JSON
python backend/pipeline/process.py

# 5. Copy output to frontend
cp backend/public/data/*.json frontend/public/data/

# 6. Run tests
pytest backend/tests/ -v

# 7. (One-time) Download district boundaries
pip install osm2geojson
python backend/pipeline/download_geojson.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # production build check
```

### Exploratory Analysis

```bash
# No raw CSVs needed — reads the Gold JSON outputs directly
python backend/analysis/explore.py
```

---

## Updating Data

```bash
source .venv/bin/activate
python backend/pipeline/download.py --months 2
python backend/pipeline/process.py
cp backend/public/data/*.json frontend/public/data/
git add frontend/public/data/
git commit -m "data: update $(date +%Y-%m-%d)"
git push   # Vercel auto-deploys
```

**Automated:** GitHub Actions runs every Monday at 09:00 Bangkok time — downloads, validates, runs pipeline + tests, commits if data changed. If Traffy's API is unavailable, it falls back to cached CSVs and the site keeps serving last-known-good data.

---

## Methodology & Data Integrity

### Grading Algorithm

Grades (A–F) are **relative** — each district is ranked by percentile against all 50 Bangkok districts, not against a fixed standard.

**Composite score (0–100):**

| Metric | Weight | Formula |
|--------|--------|---------|
| Resolution rate | 40% | `resolved / total × 100` |
| Speed | 30% | `max(0, 100 − (median_days / 30) × 100)` |
| Satisfaction | 20% | `avg_star / 5 × 100` (rated tickets only) |
| Reopen rate | 10% | `max(0, 100 − reopen_rate × 5)` |

Weights are renormalised when a metric is missing (e.g. a district with no rated tickets).

**Grade cutoffs:**

| Grade | Percentile | ~Districts |
|-------|-----------|------------|
| A | Top 20% | ~10 |
| B | 50–80% | ~15 |
| C | 20–50% | ~15 |
| D | 5–20% | ~8 |
| F | Bottom 5% | ~2 |

### Key Definitions

- **Stale ticket** — open with no activity for **90+ days**
- **Resolved** — state = `เสร็จสิ้น` in Traffy Fondue
- **Satisfaction** — averages only tickets that received a star rating (~30% of all tickets)
- **Median fix time** — uses Traffy's `duration_minutes_total` field, resolved tickets only

---

## Data Source & Credit

Data sourced from **[Traffy Fondue](https://www.traffy.in.th/)** — Bangkok's civic reporting platform, operated by [NECTEC](https://www.nectec.or.th/). Every ticket links back to its original Traffy entry. This is an independent community project, not affiliated with any government body.

---

Maintainer: [Kinosaur](https://github.com/Kinosaur) · MIT License
