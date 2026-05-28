# Transparent City — Exploratory Analysis

Five data questions answered with DuckDB SQL on Bangkok's 1.2M civic complaint records.

## How to run

```bash
# From repo root — no CSV downloads needed, reads the Gold JSON outputs
python backend/analysis/explore.py
```

Requires `duckdb` (already in `backend/requirements.txt`).

---

## The Data Source

[Traffy Fondue](https://www.traffy.in.th/) is Bangkok's civic complaint platform. Citizens file reports (potholes, broken lights, flooding) via LINE or web. AI routes each ticket to the responsible district agency. The dataset covers **Sep 2021 → May 2026**: 1,225,135 tickets across 50 Bangkok districts and ~12,000 routing paths.

---

## Key Findings

### 1 · District Momentum — some grades hide dangerous trends

Looking at resolution rate change over the last 6 months vs the prior 6 months:

| District | Grade | Prior 6mo | Recent 6mo | Change |
|---|---|---|---|---|
| พญาไท (Phaya Thai) | C | 64.1% | 68.4% | **+4.3 pp ↑** |
| บางแค (Bang Khae) | A | 66.7% | 70.0% | **+3.2 pp ↑** |
| ปทุมวัน (Pathum Wan) | F | 67.2% | 49.5% | **−17.8 pp ↓** |
| จอมทอง (Chom Thong) | C | 69.1% | 52.0% | **−17.0 pp ↓** |
| ดอนเมือง (Don Mueang) | C | 72.7% | 56.6% | **−16.2 pp ↓** |

**Insight:** Pathum Wan holds a grade F **and** lost another 18 pp in 6 months — a double-declining district. Chom Thong and Don Mueang are grade C districts quietly sliding toward D. Grade snapshots miss momentum; you need the trend.

---

### 2 · Speed Predicts Satisfaction (r = −0.41)

Across all 50 districts, resolution speed and citizen satisfaction have a **moderate negative correlation** (Pearson r = −0.41, p < 0.01): districts that close tickets faster tend to receive higher satisfaction scores.

The five fastest-resolving districts all sit above the city average for satisfaction. The relationship isn't perfect — some fast districts have mediocre scores, suggesting response speed is necessary but not sufficient.

**DE takeaway:** This cross-dataset join (spatial × operational × survey data) required joining `median_resolution_days` and `avg_satisfaction` on `district`. Both come from different aggregation paths in the Gold layer.

---

### 3 · Stale Ticket Hotspots — where complaints go quiet

Tickets with no activity for 90+ days ("stale") cluster in specific districts:

| District | Grade | Stale % | Notes |
|---|---|---|---|
| บางพลัด (Bang Phlat) | D | **32.1%** | Nearly 1 in 3 open tickets forgotten |
| ห้วยขวาง (Huai Khwang) | D | 29.1% | |
| สวนหลวง (Suan Luang) | D | 25.5% | |
| คลองเตย (Khlong Toei) | C | 24.6% | Grade C despite 1-in-4 stale rate |
| บางนา (Bang Na) | F | 23.8% | |

**Insight:** A district can hold grade C yet let 1 in 4 complaints go dark — because grade is built on *resolution rate* (resolved / total), not ticket age. A complaint marked "in progress" indefinitely doesn't pull the grade down but does count as stale. These are the cases most likely to produce angry repeat reporters.

---

### 4 · March Consistently Peaks

March is Bangkok's highest-complaint month (49,247 tickets in March 2025, well above the 28,468 monthly average for the trailing year). The pattern holds across multiple years.

**Hypothesis:** End of dry season (Feb–Apr) brings peak construction activity, heat-warped road surfaces, and pre-monsoon infrastructure stress — all visible-damage categories that drive Traffy reports. This is worth validating against rainfall data (available via TMD open data API).

---

### 5 · Recency Bias Trap — why raw resolution rates mislead

A naive comparison of monthly resolution rates shows ~90% in 2022 vs ~60% in 2025–2026. This looks like platform failure. **It isn't.**

```
2022-07:  89.0%    2025-12:  67.7%
2022-08:  90.1%    2026-01:  70.7%
2022-09:  91.7%    2026-02:  61.3%
2022-10:  90.8%    2026-03:  49.9%
2022-11:  89.7%    2026-04:  60.4%
2022-12:  89.4%    2026-05:  45.6%
```

A ticket filed in July 2022 has had **3+ years** to be resolved. A ticket filed in May 2026 has had **days**. Both count in their month's denominator. The 2026 numbers look low simply because the pipeline ran before most recent tickets could be processed.

**The right approach:** cohort analysis — track what % of tickets opened in month X were resolved within 30 / 60 / 90 days. This is on the roadmap.

> This is one of the most common traps in operational analytics. Always ask: "when was this metric captured relative to when the events occurred?"

---

### 6 · Agency Volume vs Speed — scale is weakly helpful

For agencies handling 500+ tickets, the correlation between ticket volume and median resolution days is **r = −0.076** — essentially no relationship. Bigger agencies are not meaningfully faster or slower.

However, a 2×2 quadrant analysis (high/low resolution rate × fast/slow) reveals a clear "star" cluster: agencies that are both high-resolution-rate and fast. These tend to be district-specific routing chains (e.g. a district's dedicated roads team) rather than city-wide agencies.

---

## SQL Patterns Used

All queries run via DuckDB on the Gold JSON outputs — no database server, no CSV downloads required.

**JSON unnest + window function for time-series windows:**
```sql
WITH monthly AS (
    SELECT d.district, unnest(d.monthly_trend) AS m FROM read_json('districts.json') AS d
),
with_idx AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY district ORDER BY (SELECT NULL)) AS rn,
              COUNT(*)     OVER (PARTITION BY district) AS total_months
    FROM monthly
)
SELECT district,
    SUM(CASE WHEN rn > total_months - 6 THEN m.resolved ELSE 0 END) /
    SUM(CASE WHEN rn > total_months - 6 THEN m.total    ELSE 0 END) * 100 AS recent_rate
FROM with_idx GROUP BY district
```

**Inline 2×2 quadrant using CASE + medians CTE:**
```sql
WITH medians AS (SELECT MEDIAN(resolution_rate) AS med_r, MEDIAN(median_days) AS med_d FROM orgs),
quadrant AS (
    SELECT *, CASE
        WHEN resolution_rate >= m.med_r AND median_days <= m.med_d THEN 'High-rate & Fast ⭐'
        ELSE '...'
    END AS quadrant
    FROM orgs, medians m
)
SELECT quadrant, COUNT(*), AVG(resolution_rate), AVG(median_days) FROM quadrant GROUP BY quadrant
```

---

## What's Missing (and Why It Matters)

| Analysis | Data needed | Status |
|---|---|---|
| Cohort resolution rates (fix the recency bias) | Raw CSVs with timestamps | Needs CSVs |
| Hour-of-day complaint patterns | `timestamp` column from CSVs | Needs CSVs |
| Weekend vs weekday resolution speed | `timestamp` + `last_activity` | Needs CSVs |
| Rainfall correlation with complaint volume | TMD open data API | Future work |
| Geographic clustering of stale tickets | Lat/lon from CSVs | Needs CSVs |

The Gold JSON outputs are sufficient for district-level and org-level analyses. For ticket-level queries (time-of-day, cohort rates, geographic heatmaps), the pipeline must be re-run locally with the full CSV dataset.
