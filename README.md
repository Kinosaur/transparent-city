# เมืองโปร่งใส — Transparent City Bangkok

Community-driven civic transparency platform for Bangkok. Built on [Traffy Fondue](https://www.traffy.in.th/) open data.

> เพราะเมืองที่ดี ต้องเริ่มจากการตั้งคำถามที่ถูก
> *A better city starts with asking the right questions.*

Maintainer: [Kinosaur](https://github.com/Kinosaur/)

**Live pages:**
- `/th` or `/en` — Bangkok Overview: KPIs, monthly trends, top problem types
- `/th/districts` or `/en/districts` — District Report Card: A–F grades, comparisons, stale ticket lists
- `/th/leaderboard` or `/en/leaderboard` — Agency Leaderboard: resolution, speed, satisfaction, reopen metrics
- `/th/gallery` or `/en/gallery` — Before/After Gallery: resolved issue photo pairs
- `/th/map` or `/en/map` — Story-driven map: stale + low-satisfaction tickets, choropleth by district performance

---

## Project Structure

```
.
├── backend/
│   ├── data/               # Raw CSVs from Traffy — NOT in git (see below)
│   ├── pipeline/
│   │   ├── download.py     # Download monthly CSVs from Traffy open data
│   │   ├── process.py      # Clean → enrich → aggregate → export JSON
│   │   └── download_geojson.py  # One-time Bangkok district boundary download
│   ├── public/data/        # Pipeline output (JSON) — intermediate, not served
│   └── requirements.txt
│
├── frontend/               # Next.js 16 app (App Router, Tailwind v4)
│   ├── app/[lang]/         # Locale-aware routes (/th, /en)
│   ├── components/         # React components (all typed)
│   ├── dictionaries/       # th.json + en.json translation strings
│   ├── lib/types.ts        # Shared TypeScript types
│   └── public/data/        # JSON files served as static assets ← COMMITTED
│       ├── overview.json
│       ├── districts.json
│       ├── monthly_trends.json
│       ├── orgs.json
│       ├── gallery.json
│       ├── points.json
│       └── bangkok-districts.geojson
│
└── .github/workflows/
    └── update-data.yml     # Weekly data refresh (every Monday 09:00 BKK)
```

---

## Why CSVs Are Not in Git

The raw CSV files (`backend/data/`) span 2021–present and are too large for a git repository. They are:

- **Downloaded locally** when you first set up (see below)
- **Cached by GitHub Actions** between runs so they aren't re-downloaded every week
- **Only the latest 2 months** are re-downloaded each weekly run

The pipeline **output** (`frontend/public/data/*.json`) IS committed — it's what the frontend actually uses.

---

## Local Setup

### Backend (data pipeline)

```bash
# 1. Create virtual environment
python3 -m venv .venv && source .venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Download all historical CSVs (~48 files, one-time)
python backend/pipeline/download.py --all

# 4. Run the pipeline → generates JSON in backend/public/data/
python backend/pipeline/process.py

# 5. Copy output to frontend
cp backend/public/data/*.json frontend/public/data/

# 6. (One-time) Download district boundaries for map page
python backend/pipeline/download_geojson.py
```

> `download_geojson.py` requires `osm2geojson`. If missing, install once with:
>
> ```bash
> pip install osm2geojson
> ```

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

> **Note for macOS:** If `npm run dev` fails with a Turbopack error about `~/.Trash`,
> this is already fixed in `next.config.ts` via `turbopack.root: __dirname`.
> Make sure you run `npm run dev` from **inside** the `frontend/` folder.

---

## Updating Data Locally (Primary Method)

This is the **recommended workflow** for keeping data fresh:

```bash
# 1. Activate virtual environment
source .venv/bin/activate

# 2. Download the latest 2 months from Traffy
#    (Visit https://bangkok.traffy.in.th if automated download fails)
python backend/pipeline/download.py --months 2

# 3. Run the data pipeline → generates JSON
python backend/pipeline/process.py

# 4. Copy output to frontend and commit
cp backend/public/data/*.json frontend/public/data/
git add frontend/public/data/
git commit -m "data: update $(date +%Y-%m-%d)"
git push
```

**Result:** Vercel detects the push and automatically redeploys with fresh data ✓

**Frequency:** Run this whenever Traffy releases new data (typically weekly)

---

## Data Pipeline & Updates

### How Data Flows to the Frontend

```
Traffy API (bangkok.traffy.in.th)
    ↓ [CSV download]
backend/data/*.csv (RAW DATA — gitignored, too large)
    ↓ [python process.py]
backend/public/data/*.json (PIPELINE OUTPUT)
    ↓ [git commit & push]
frontend/public/data/*.json (FRONTEND DATA — committed to git ✓)
    ↓ [Vercel auto-deploy]
Live website ✓
```

### The Current Workflow (April 2026)

**Status:** GitHub Actions workflow is resilient and graceful.

**The Challenge:**
- Raw CSV files are **~3.5 GB** and change weekly → can't commit to git
- Traffy's public API endpoints are either rate-limited or have changed → auto-download is unreliable

**The Solution:**
1. **You download CSVs locally** when Traffy releases new data
   ```bash
   # Visit https://bangkok.traffy.in.th and download manually, or:
   source .venv/bin/activate
   python backend/pipeline/download.py --months 2
   ```

2. **You run the pipeline locally** to generate JSON
   ```bash
   python backend/pipeline/process.py
   ```

3. **You commit & push the JSON output** (small files, ~5 MB total)
   ```bash
   cp backend/public/data/*.json frontend/public/data/
   git add frontend/public/data/
   git commit -m "data: update $(date +%Y-%m-%d)"
   git push
   ```

4. **Vercel auto-deploys** — no manual deploy needed

### GitHub Actions Workflow (`.github/workflows/update-data.yml`)

Runs **every Monday at 09:00 Bangkok time** (or manually via Actions tab).

**Current behavior (resilient):**
- Attempts to download latest 2 months from Traffy
- If download fails → **skips gracefully** (doesn't crash) ✓
- If CSVs available → runs pipeline and pushes JSON
- If no CSVs → site continues serving existing data (no downtime)

**Result:** Workflow never fails. Even if Traffy API is temporarily unavailable, the site stays live with last-known-good data.

### Manual Workflow Trigger

Go to GitHub Actions tab → *Update Traffy Data* → *Run workflow*
- Specify how many months to download (default: 2)
- Useful when you want to pull fresh data immediately

### Future Improvements (Optional)

If Traffy fixes their API or provides a stable endpoint:
- Auto-download will work reliably
- Workflow could push JSON automatically (zero manual steps)
- Until then, local download + push is the most reliable method

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Data pipeline | Python, pandas, numpy |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Mapping | Leaflet, react-leaflet, react-leaflet-cluster |
| Motion | Framer Motion |
| i18n | Native `[lang]` routing (TH/EN) |
| Hosting | Vercel (free tier) |
| CI/CD | GitHub Actions |

---

## Recent Milestones

- `59a0cd4` — Phase 1 complete: backend pipeline + overview/district outputs
- `6cb0350` — Refactor structure and add leaderboard/gallery pages
- `04ae425` — Week 7–8 map feature: choropleth, clustering, story-driven filters
- `6e49ad6` — Fix TypeScript casting for Leaflet icon prototype
- `6fdb4c2` — Fix 3 mobile bugs
- `4f5309b` — Improve chart tooltip/dropdown readability with opacity + blur updates

---

## Data Source & Credit

Data sourced from **[Traffy Fondue](https://www.traffy.in.th/)** — Bangkok's civic reporting platform, operated by NECTEC.

- Every ticket links back to its original Traffy page
- This is a community project, not affiliated with or endorsed by any government body
- Open source — contributions welcome
