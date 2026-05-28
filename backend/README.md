# Transparent City — Data Engineering Backend

A production-style data pipeline that ingests ~1.2M Bangkok civic complaint tickets from the [Traffy Fondue](https://www.traffy.in.th/) open data API, transforms them, and exports JSON consumed by the Next.js frontend.

Built as a **portfolio project** demonstrating core data engineering skills: pipeline design, data quality, SQL analytics, testing, and CI/CD automation.

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Data Sources                                 │
│  Traffy Fondue Public API                                           │
│  publicapi.traffy.in.th  (51 monthly CSVs, Sep 2021 → present)     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  download.py
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BRONZE  —  Raw Storage                                             │
│  backend/data/bangkok_YYYY-MM.csv  (51 files, ~2.5 GB total)       │
│  manifest.json  (tracks what was downloaded and when)              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  process.py  (pandas)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SILVER  —  Cleaned & Enriched DataFrame                           │
│  • Dedup on ticket_id                                               │
│  • Coordinate parsing  ("lon,lat" string → float columns)          │
│  • Timestamp normalization                                          │
│  • Province + district allowlist filter (Bangkok 50 only)          │
│  • Derived columns: is_resolved, is_stale, resolution_days,        │
│    days_open, ym, has_photos                                        │
│  • Schema validation + state value checks                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  process.py  (DuckDB SQL)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GOLD  —  Aggregated Outputs                                        │
│  • overview.json        City-wide KPIs + monthly trends            │
│  • districts.json       50 districts with A–F grades               │
│  • orgs.json            Agency leaderboard                         │
│  • gallery.json         500 before/after photo pairs               │
│  • points.json          25K map points (stale + low-sat)           │
│  • monthly_trends.json  Standalone trend data for charting         │
│  • data_profile.json    Pipeline audit trail (committed to git)    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  git commit + push
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  frontend/public/data/  →  Vercel  →  transparent-city.vercel.app  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack & Why

| Tool | Role | Why this tool? |
|---|---|---|
| **Python** | Orchestration, ETL | Readable, rich data ecosystem |
| **pandas** | Bronze→Silver (messy ETL) | Best for row-level transformations, timestamp parsing, coordinate normalization |
| **DuckDB** | Silver→Gold (analytics) | In-process SQL engine; no server needed. Window functions and CTEs make complex aggregations readable and fast. Runs 1.2M rows in <1s. |
| **pytest** | Pipeline testing | Tests the JSON *outputs* as data contracts — catches silent wrong results |
| **GitHub Actions** | Orchestration & CI | Weekly cron + automated quality gates; no Airflow server needed at this scale |

---

## Data Source: Traffy Fondue

Traffy Fondue is Bangkok's civic complaint platform, built by [NECTEC](https://www.nectec.or.th/). Citizens report problems (potholes, broken lights, flooding) via LINE or web. AI routes each ticket to the responsible agency.

### CSV Schema (24 columns, stable across all 51 files)

| Column | Type | Notes |
|---|---|---|
| `ticket_id` | string | Unique ID. File has UTF-8 BOM — handled with `encoding='utf-8-sig'` |
| `type` | string | Hierarchical, up to 3 levels: `Category -> Subcategory -> Detail` |
| `organization` | string | Comma-separated chain of agencies in the routing path |
| `organization_action` | string | Agencies that actually acted |
| `comment` | string | Citizen's free-text description |
| `coords` | string | `"lon,lat"` combined — note longitude-first order. `"0,0"` = no location shared |
| `photo` | string | Google Cloud Storage URL (before photo) |
| `photo_after` | string | Google Cloud Storage URL (after photo) |
| `address` | string | Free-text address |
| `subdistrict` | string | แขวง |
| `district` | string | เขต — one of 50 Bangkok districts |
| `province` | string | จังหวัด |
| `timestamp` | datetime | Ticket submission time |
| `state` | string | **Only 3 values:** เสร็จสิ้น / กำลังดำเนินการ / รอรับเรื่อง |
| `star` | float | Citizen satisfaction 1–5. **~70% null** — only rated tickets |
| `count_reopen` | int | Number of times ticket was reopened |
| `last_activity` | datetime | Last status change |
| `duration_minutes_inprogress` | int | Minutes from submission to in-progress |
| `duration_minutes_finished` | int | Minutes from in-progress to resolved |
| `duration_minutes_total` | int | Total resolution time in minutes |
| `timestamp_inprogress` | datetime | When moved to in-progress |
| `timestamp_finished` | datetime | When resolved |
| `message_id` | string | Internal Traffy message ID |
| `problemtype_tag` | string | JSON set of type tags (usually mirrors `type`) |

### Known data quirks

- `coords` is `"lon,lat"` (longitude first — opposite of common convention)
- `0.00000,0.00000` means no location; not an actual point in the Gulf of Guinea
- ~70% of tickets have no star rating — only satisfied/dissatisfied citizens tend to rate
- Early files (2021-09 through 2022-04) have 1–21 rows — Traffy was in pilot phase
- Several months are missing from the time series (2022-02, 2022-03, 2022-05, 2022-06) — data was never published for those months
- The `organization` field is a comma-separated routing chain, not a single agency

---

## Grading Algorithm

District grades (A–F) are assigned by **percentile rank**, not absolute thresholds. This means grades compare districts against each other rather than against a fixed standard.

**Composite score (0–100):**

| Metric | Weight | Formula |
|---|---|---|
| Resolution rate | 40% | `resolved / total * 100` |
| Speed | 30% | `max(0, 100 - (median_days / 30) * 100)` — 30 days = 0 points |
| Satisfaction | 20% | `avg_star / 5 * 100` — only rated tickets |
| Reopen rate | 10% | `max(0, 100 - reopen_rate * 5)` — 20% reopen = 0 points |

Weights are renormalised when a metric is missing (e.g. a district with no rated tickets still gets a score from the other three metrics).

**Grade cutoffs (percentile of composite score):**

| Grade | Percentile | ~Districts |
|---|---|---|
| A | Top 20% | ~10 |
| B | 50–80% | ~15 |
| C | 20–50% | ~15 |
| D | 5–20% | ~8 |
| F | Bottom 5% | ~2 |

---

## Key SQL Patterns (Gold Layer)

The Gold layer uses DuckDB SQL. Two patterns worth understanding:

**QUALIFY — filter on a window function without a subquery:**
```sql
-- Top 3 problem types per district
SELECT district, type, COUNT(*) AS count
FROM tickets
GROUP BY district, type
QUALIFY ROW_NUMBER() OVER (PARTITION BY district ORDER BY COUNT(*) DESC) <= 3
```

**CTE + ROW_NUMBER — top-N per group (worst stale tickets per district):**
```sql
WITH stale_ranked AS (
    SELECT ticket_id, type, district, address, days_open,
           ROW_NUMBER() OVER (PARTITION BY district ORDER BY days_open DESC) AS rn
    FROM tickets
    WHERE is_stale = TRUE
)
SELECT * FROM stale_ranked WHERE rn <= 5
```

---

## Running Locally

```bash
# 1. Create virtual environment
python3 -m venv .venv && source .venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Download data (register at https://bangkok.traffy.in.th first)
export TRAFFY_NAME="Your Name"
export TRAFFY_EMAIL="you@example.com"
export TRAFFY_ORG="Your Organisation"
export TRAFFY_PURPOSE="research"

python backend/pipeline/download.py --all   # first run (~51 files)
python backend/pipeline/download.py         # weekly updates (last 2 months)

# 4. Run pipeline
python backend/pipeline/process.py

# 5. Validate outputs
python backend/pipeline/validate.py

# 6. Run tests
pytest backend/tests/ -v

# 7. Copy to frontend
cp backend/public/data/*.json frontend/public/data/
```

---

## CI/CD

GitHub Actions runs every Monday at 09:00 Bangkok time:

1. Restores cached CSVs (cache key: ISO year + week number)
2. Downloads the latest 2 months from Traffy
3. Validates CSV schema — fails immediately on schema drift
4. Runs the full pipeline
5. Runs pytest — **never commits if tests fail**
6. Commits and pushes if data changed → Vercel auto-deploys
7. Writes a rich job summary to the Actions UI

---

## What I Would Add With More Time

- **Incremental pipeline** — process only newly downloaded months; currently reprocesses all 51 files on every run
- **Data warehouse** — load into DuckDB persistent file or BigQuery for historical querying
- **dbt** — model the Silver→Gold transforms as version-controlled SQL with auto-generated docs and lineage graphs
- **Streaming** — Traffy also exposes a real-time feed; a streaming layer (Kafka → Flink) could power live updates
- **Alerting** — Slack/email notification when the weekly run fails or data quality drops below threshold
- **Docker** — containerize the pipeline so it runs identically everywhere
