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

## Updating Data Manually

```bash
source .venv/bin/activate

# Download the latest 2 months
python backend/pipeline/download.py --months 2

# Re-run pipeline
python backend/pipeline/process.py

# Copy to frontend and commit
cp backend/public/data/*.json frontend/public/data/
git add frontend/public/data/
git commit -m "data: manual update $(date +%Y-%m-%d)"
```

---

## GitHub Actions — Automated Weekly Update

The workflow in `.github/workflows/update-data.yml` runs every **Monday at 09:00 Bangkok time**.

**What it does:**
1. Restores cached CSVs (avoids re-downloading all 48 files every week)
2. Downloads the latest 2 months of CSVs from Traffy open data
3. Runs `backend/pipeline/process.py`
4. Copies new JSON files to `frontend/public/data/`
5. Commits and pushes only if the data actually changed

**Manual trigger:** Go to Actions tab → *Update Traffy Data* → *Run workflow*. You can specify how many months to re-download.

**Vercel auto-deploy:** When the bot pushes updated JSON files, Vercel detects the push and rebuilds automatically (no extra configuration needed).

### First-time GitHub setup

```bash
# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

No secrets required — the workflow only reads public Traffy data and writes back to the same repo.

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
