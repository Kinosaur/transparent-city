# เมืองโปร่งใส — Transparent City Bangkok

**Community-driven civic transparency for Bangkok — powered by [Traffy Fondue](https://www.traffy.in.th/) open data.**

> เพราะเมืองที่ดี ต้องเริ่มจากการตั้งคำถามที่ถูก
> *A better city starts with asking the right questions.*

[![Live Site](https://img.shields.io/badge/Live%20Site-transparent--city.vercel.app-2dd4bf?style=flat-square&logo=vercel&logoColor=white)](https://transparent-city.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-2dd4bf?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

[![Preview](https://transparent-city.vercel.app/api/og?page=overview&lang=en)](https://transparent-city.vercel.app/en)

---

## What is this?

1.1 million civic tickets. 50 Bangkok districts. One transparent dashboard.

Transparent City pulls Traffy Fondue open data and surfaces it as a civic transparency tool: which districts fix problems fastest, which agencies are falling behind, which neighbourhoods have tickets sitting unresolved for months.

Available in **Thai 🇹🇭** and **English 🇬🇧**.

---

## Pages

| Page | URL | What it shows |
|------|-----|---------------|
| **Overview** | `/en` | City-wide KPIs, monthly trend, top 10 problem types |
| **Districts** | `/en/districts` | Per-district report card with A–F grade, resolution rate, stale tickets |
| **Rankings** | `/en/leaderboard` | Agency leaderboard — resolution speed, satisfaction, reopen rate |
| **Gallery** | `/en/gallery` | Before/After photo pairs of resolved civic issues |
| **Map** | `/en/map` | Story-driven map — stale tickets, low-satisfaction clusters, district choropleth |

Each district report card is **shareable** — e.g. `/en/districts?district=chatuchak` deep-links to Chatuchak's card with its own social preview image.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Mapping | Leaflet + react-leaflet-cluster |
| Animation | Framer Motion |
| i18n | Native `[lang]` routing (TH / EN) |
| Data pipeline | Python, pandas |
| Hosting | Vercel |
| CI/CD | GitHub Actions |

---

## Project Structure

```
.
├── backend/
│   ├── data/               # Raw CSVs from Traffy — gitignored (too large)
│   ├── pipeline/
│   │   ├── download.py     # Download monthly CSVs from Traffy open data
│   │   ├── process.py      # Clean → enrich → aggregate → export JSON
│   │   └── download_geojson.py  # One-time Bangkok district boundary download
│   └── requirements.txt
│
├── frontend/               # Next.js 16 app
│   ├── app/[lang]/         # Locale-aware routes (/th, /en)
│   ├── app/api/og/         # Dynamic OG image generation
│   ├── components/         # React components (fully typed)
│   ├── dictionaries/       # th.json + en.json translation strings
│   ├── lib/                # Shared types, utilities, district name maps
│   └── public/data/        # Pipeline output (JSON) — committed to git ✓
│       ├── overview.json
│       ├── districts.json
│       ├── monthly_trends.json
│       ├── orgs.json
│       ├── gallery.json
│       ├── points.json
│       └── bangkok-districts.geojson
│
└── .github/workflows/
    └── update-data.yml     # Weekly data refresh (Mon 09:00 BKK)
```

---

## Local Setup

### Backend (data pipeline)

```bash
# 1. Create virtual environment
python3 -m venv .venv && source .venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Download all historical CSVs (one-time, ~48 files)
python backend/pipeline/download.py --all

# 4. Run pipeline → generates JSON
python backend/pipeline/process.py

# 5. Copy output to frontend
cp backend/public/data/*.json frontend/public/data/

# 6. (One-time) Download district boundaries
python backend/pipeline/download_geojson.py
```

> `download_geojson.py` requires `osm2geojson`:
> ```bash
> pip install osm2geojson
> ```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # production build check
```

---

## Updating Data

```bash
source .venv/bin/activate

# Download latest months (or grab CSVs manually from bangkok.traffy.in.th)
python backend/pipeline/download.py --months 2

# Run pipeline
python backend/pipeline/process.py

# Copy + commit
cp backend/public/data/*.json frontend/public/data/
git add frontend/public/data/
git commit -m "data: update $(date +%Y-%m-%d)"
git push
```

Vercel auto-deploys on push — no manual deploy needed.

### How Data Flows

```
Traffy Fondue API (bangkok.traffy.in.th)
    ↓  download.py
backend/data/*.csv          ← gitignored (too large)
    ↓  process.py
backend/public/data/*.json  ← intermediate
    ↓  git commit & push
frontend/public/data/*.json ← committed to git ✓
    ↓  Vercel auto-deploy
transparent-city.vercel.app ✓
```

### GitHub Actions

Runs every Monday at 09:00 BKK time. Attempts auto-download; if Traffy's API is unavailable, skips gracefully and the site keeps serving last-known-good data. No downtime.

---

## Methodology & Data Integrity

### How District Grades Work

Grades (A–F) are **relative**, not absolute. Each district is scored on a 0–100 composite, then ranked by percentile across all 50 Bangkok districts:

| Grade | Percentile |
|-------|-----------|
| A | Top 20% (~10 districts) |
| B | 50–80% (~15 districts) |
| C | 20–50% (~15 districts) |
| D | 5–20% (~7 districts) |
| F | Bottom 5% (~3 districts) |

This means grades reflect *relative* performance — if all districts improve equally, the grade distribution stays the same. The goal is comparison, not certification.

### Composite Score Weights

| Metric | Weight | Notes |
|--------|--------|-------|
| Resolution rate | 40% | % of tickets marked เสร็จสิ้น |
| Speed | 30% | Inverted median fix time, capped at 30 days = 0 |
| Satisfaction | 20% | Avg star rating / 5, rated tickets only |
| Reopen rate | 10% | Inverted — lower reopen = higher score |

### Key Definitions

- **Stale ticket** — open with no activity for **90+ days**
- **Resolved** — state = `เสร็จสิ้น` in Traffy Fondue
- **Satisfaction** — averages only tickets that received a star rating (not all tickets are rated)
- **Median fix time** — uses Traffy's own `duration_minutes_total` field, resolved tickets only

### Data Freshness

The `Data from … to …` range shown on the site reflects the actual ticket timestamps in the dataset. The pipeline is run locally when Traffy releases new data and the JSON outputs are committed to the repository.

---

## Contributing

Issues and PRs are welcome. A few things worth knowing:

- Data comes from Traffy Fondue open data — this project doesn't collect or store any personal data
- The frontend is fully static (pre-rendered JSON) — no database, no backend server
- Thai language is the primary locale; English is a community addition

---

## Data Source & Credit

Data sourced from **[Traffy Fondue](https://www.traffy.in.th/)** — Bangkok's civic reporting platform, operated by NECTEC.

- Every ticket links back to its original Traffy entry
- This is an independent community project, not affiliated with any government body

---

Maintainer: [Kinosaur](https://github.com/Kinosaur) · MIT License
