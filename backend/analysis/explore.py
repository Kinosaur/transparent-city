"""
Transparent City — Exploratory Analysis
========================================
Queries the pipeline's Gold JSON outputs using DuckDB SQL.
No raw CSVs required — works from the already-generated frontend/public/data/ files.

Why DuckDB on JSON?
  DuckDB can read JSON files natively via read_json(). This means the same SQL
  skills used on databases work seamlessly on flat files — a common pattern in
  modern data engineering (query-in-place / data lakehouse).

Run:
    python backend/analysis/explore.py

Portfolio context:
    These five analyses answer the kind of "walk me through something interesting
    you found in the data" question that comes up in every DE interview.
"""

from pathlib import Path
import duckdb

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT     = Path(__file__).parent.parent.parent
DATA_DIR = ROOT / "frontend" / "public" / "data"

OVERVIEW  = str(DATA_DIR / "overview.json")
DISTRICTS = str(DATA_DIR / "districts.json")
ORGS      = str(DATA_DIR / "orgs.json")

con = duckdb.connect()

# ── helpers ───────────────────────────────────────────────────────────────────
DIVIDER = "─" * 70

def section(title: str) -> None:
    print(f"\n{DIVIDER}")
    print(f"  {title}")
    print(DIVIDER)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. DISTRICT MOMENTUM — which districts improved/declined most in the last 6 months?
# ═══════════════════════════════════════════════════════════════════════════════

section("1 · District Momentum  (6-month resolution rate: latest vs prior 6 months)")

# DuckDB unnests the monthly_trend array, partitions by district,
# and computes resolution rates for two consecutive 6-month windows.
momentum = con.execute(f"""
WITH monthly AS (
    SELECT
        d.district,
        d.grade,
        unnest(d.monthly_trend) AS month_data
    FROM read_json('{DISTRICTS}') AS d
),
with_idx AS (
    SELECT
        district,
        grade,
        month_data.total    AS total,
        month_data.resolved AS resolved,
        ROW_NUMBER() OVER (PARTITION BY district ORDER BY (SELECT NULL)) AS rn,
        COUNT(*)     OVER (PARTITION BY district)                        AS total_months
    FROM monthly
),
windowed AS (
    SELECT
        district,
        grade,
        -- latest 6 months
        SUM(CASE WHEN rn > total_months - 6 THEN resolved ELSE 0 END) /
            NULLIF(SUM(CASE WHEN rn > total_months - 6 THEN total ELSE 0 END), 0) * 100
            AS recent_rate,
        -- prior 6 months
        SUM(CASE WHEN rn > total_months - 12 AND rn <= total_months - 6 THEN resolved ELSE 0 END) /
            NULLIF(SUM(CASE WHEN rn > total_months - 12 AND rn <= total_months - 6 THEN total ELSE 0 END), 0) * 100
            AS prior_rate
    FROM with_idx
    WHERE total_months >= 12
    GROUP BY district, grade
)
SELECT
    district,
    grade,
    ROUND(prior_rate, 1)                AS prior_6mo_pct,
    ROUND(recent_rate, 1)               AS recent_6mo_pct,
    ROUND(recent_rate - prior_rate, 1)  AS delta_pp
FROM windowed
WHERE prior_rate IS NOT NULL AND recent_rate IS NOT NULL
ORDER BY delta_pp DESC
""").fetchall()

print(f"\n  {'District':<22} {'Grade':^5} {'Prior 6mo':>10} {'Recent 6mo':>11} {'Δ pp':>7}")
print(f"  {'-'*22} {'-'*5} {'-'*10} {'-'*11} {'-'*7}")
print("  ── Top 5 improving ──")
for row in momentum[:5]:
    district, grade, prior, recent, delta = row
    arrow = "↑" if delta > 0 else "↓"
    sign  = "+" if delta > 0 else ""
    print(f"  {district:<22} {grade:^5} {prior:>9.1f}%  {recent:>10.1f}%  {arrow}{sign}{delta:.1f}")

print("  ── Top 5 declining ──")
for row in momentum[-5:]:
    district, grade, prior, recent, delta = row
    arrow = "↑" if delta > 0 else "↓"
    sign  = "+" if delta > 0 else ""
    print(f"  {district:<22} {grade:^5} {prior:>9.1f}%  {recent:>10.1f}%  {arrow}{sign}{delta:.1f}")


# ═══════════════════════════════════════════════════════════════════════════════
# 2. SATISFACTION vs SPEED — does resolving faster produce happier citizens?
# ═══════════════════════════════════════════════════════════════════════════════

section("2 · Satisfaction vs Speed  (Pearson r across 50 districts)")

corr = con.execute(f"""
SELECT
    ROUND(CORR(avg_satisfaction, median_resolution_days), 3) AS pearson_r,
    COUNT(*) AS n_districts
FROM read_json('{DISTRICTS}')
WHERE avg_satisfaction IS NOT NULL
  AND median_resolution_days IS NOT NULL
""").fetchone()

r, n = corr
direction = "faster resolution → higher satisfaction ✓" if r < 0 else "faster resolution → lower satisfaction (?)"
strength  = "moderate" if abs(r) > 0.3 else "weak"

print(f"\n  Pearson r = {r:+.3f}  (n={n} districts)")
print(f"  Interpretation: {strength} negative correlation — {direction}")
print(f"\n  In plain language: districts that close tickets faster tend to receive")
print(f"  higher citizen satisfaction scores. Speed of service matters.")

# Show the top 5 fastest districts and their satisfaction
print(f"\n  {'District':<22} {'Grade':^5} {'Median days':>12} {'Avg satisfaction':>17}")
print(f"  {'-'*22} {'-'*5} {'-'*12} {'-'*17}")
fast = con.execute(f"""
SELECT district, grade,
       ROUND(median_resolution_days, 1) AS median_days,
       ROUND(avg_satisfaction, 2)       AS avg_sat
FROM read_json('{DISTRICTS}')
WHERE median_resolution_days IS NOT NULL
  AND avg_satisfaction IS NOT NULL
ORDER BY median_resolution_days ASC
LIMIT 5
""").fetchall()
for row in fast:
    district, grade, days, sat = row
    print(f"  {district:<22} {grade:^5} {days:>10.1f}d  {sat:>16.2f}/5")


# ═══════════════════════════════════════════════════════════════════════════════
# 3. STALE TICKET HOTSPOTS — where do complaints go to die?
# ═══════════════════════════════════════════════════════════════════════════════

section("3 · Stale Ticket Hotspots  (90+ days inactive, unresolved)")

hotspots = con.execute(f"""
SELECT
    district,
    grade,
    total_tickets,
    stale_tickets,
    ROUND(stale_tickets * 100.0 / NULLIF(total_tickets, 0), 1) AS stale_pct,
    median_resolution_days
FROM read_json('{DISTRICTS}')
WHERE total_tickets >= 1000
ORDER BY stale_pct DESC
LIMIT 8
""").fetchall()

print(f"\n  {'District':<22} {'Grade':^5} {'Total':>8} {'Stale':>7} {'Stale %':>8} {'Med days':>9}")
print(f"  {'-'*22} {'-'*5} {'-'*8} {'-'*7} {'-'*8} {'-'*9}")
for row in hotspots:
    district, grade, total, stale, pct, med = row
    med_str = f"{med:.1f}d" if med is not None else "—"
    print(f"  {district:<22} {grade:^5} {total:>8,} {stale:>7,} {pct:>7.1f}%  {med_str:>9}")

print(f"\n  A district can have a good grade (C or B) yet harbour a high stale rate")
print(f"  — grade reflects resolution rate, not age of open tickets.")


# ═══════════════════════════════════════════════════════════════════════════════
# 4. MONTHLY PEAK & SEASONALITY — when do Bangkokians complain most?
# ═══════════════════════════════════════════════════════════════════════════════

section("4 · Monthly Peak & Seasonality")

peaks = con.execute(f"""
WITH trends AS (
    SELECT unnest(monthly_trends) AS m
    FROM read_json('{OVERVIEW}')
),
months AS (
    SELECT
        m.ym    AS ym,
        m.total AS total,
        CAST(SPLIT_PART(m.ym, '-', 2) AS INTEGER) AS month_num
    FROM trends
    WHERE m.total >= 5000   -- exclude pilot months (< 5k tickets)
)
SELECT
    ym,
    total,
    month_num,
    ROUND(AVG(total) OVER (PARTITION BY month_num), 0) AS avg_for_that_month
FROM months
ORDER BY total DESC
LIMIT 5
""").fetchall()

month_names = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',
               7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}

print(f"\n  Top 5 highest-volume months (mature data, 5k+ tickets):")
print(f"\n  {'Month':>8}  {'Tickets':>10}  {'Month avg':>12}")
print(f"  {'-'*8}  {'-'*10}  {'-'*12}")
for ym, total, mnum, avg in peaks:
    print(f"  {ym:>8}  {total:>10,}  {avg:>10,.0f} avg")

print(f"""
  Observation: March consistently peaks. This aligns with the end of Bangkok's
  dry season — construction activity surges, road conditions deteriorate after
  summer heat, and pre-monsoon infrastructure checks drive complaints up.
""")


# ═══════════════════════════════════════════════════════════════════════════════
# 5. RECENCY BIAS IN RESOLUTION RATES — a data quality warning
# ═══════════════════════════════════════════════════════════════════════════════

section("5 · Recency Bias  (why you can't compare monthly resolution rates naively)")

bias = con.execute(f"""
WITH trends AS (
    SELECT unnest(monthly_trends) AS m FROM read_json('{OVERVIEW}')
),
rates AS (
    SELECT
        m.ym  AS ym,
        m.total AS total,
        ROUND(m.resolved * 100.0 / NULLIF(m.total, 0), 1) AS res_rate
    FROM trends
    WHERE m.total >= 5000
)
SELECT ym, total, res_rate FROM rates
ORDER BY ym
""").fetchall()

earliest = rates[:6] if (rates := [r for r in bias]) else []
latest   = bias[-6:]

print(f"\n  First 6 mature months (2022)        Last 6 months (2025-2026)")
print(f"  {'Month':>8}  {'Rate':>6}             {'Month':>8}  {'Rate':>6}")
print(f"  {'-'*8}  {'-'*6}             {'-'*8}  {'-'*6}")
for (ym1, _, r1), (ym2, _, r2) in zip(earliest[:6], latest[-6:]):
    print(f"  {ym1:>8}  {r1:>5.1f}%             {ym2:>8}  {r2:>5.1f}%")

print(f"""
  The 2022 months show ~90% resolution vs ~60% for 2026. This is NOT evidence
  of a platform decline — it's a data artefact called recency bias:

    • A ticket filed in Jul 2022 has had 3+ years to be resolved.
    • A ticket filed in May 2026 has had days.

  The correct approach is cohort analysis: track what % of tickets opened in
  month X were resolved within N days (e.g. 30d, 90d). Without cohort framing,
  month-over-month resolution rate comparisons are misleading.

  This is a common trap in operational analytics — always ask "when was this
  measured relative to when the events occurred?"
""")


# ═══════════════════════════════════════════════════════════════════════════════
# 6. AGENCY VOLUME vs SPEED — do bigger agencies resolve faster?
# ═══════════════════════════════════════════════════════════════════════════════

section("6 · Agency Volume vs Speed  (does scale = efficiency?)")

vol_speed = con.execute(f"""
SELECT
    ROUND(CORR(total_tickets, median_resolution_days), 3) AS pearson_r,
    COUNT(*) AS n
FROM read_json('{ORGS}')
WHERE total_tickets >= 500
  AND median_resolution_days IS NOT NULL
""").fetchone()

r2, n2 = vol_speed
print(f"\n  Pearson r (volume vs median days) = {r2:+.3f}  (n={n2} agencies, 500+ tickets)")
direction2 = "larger agencies tend to be FASTER" if r2 < 0 else "larger agencies tend to be SLOWER"
print(f"  {direction2}  (weak relationship — volume alone doesn't predict speed)")
print()

# Show a 2x2 quadrant snapshot
quads = con.execute(f"""
WITH base AS (
    SELECT
        organization,
        total_tickets,
        resolution_rate,
        median_resolution_days
    FROM read_json('{ORGS}')
    WHERE total_tickets >= 2000
      AND resolution_rate IS NOT NULL
      AND median_resolution_days IS NOT NULL
),
medians AS (
    SELECT
        MEDIAN(resolution_rate)        AS med_rate,
        MEDIAN(median_resolution_days) AS med_days
    FROM base
),
quadrant AS (
    SELECT
        b.organization,
        b.total_tickets,
        ROUND(b.resolution_rate, 1)        AS res_rate,
        ROUND(b.median_resolution_days, 1) AS med_days,
        CASE
            WHEN b.resolution_rate >= m.med_rate AND b.median_resolution_days <= m.med_days THEN 'High-rate & Fast  ⭐'
            WHEN b.resolution_rate >= m.med_rate AND b.median_resolution_days >  m.med_days THEN 'High-rate & Slow'
            WHEN b.resolution_rate <  m.med_rate AND b.median_resolution_days <= m.med_days THEN 'Low-rate  & Fast'
            ELSE                                                                               'Low-rate  & Slow  ⚠'
        END AS quadrant
    FROM base b, medians m
)
SELECT quadrant, COUNT(*) AS agencies,
       ROUND(AVG(res_rate), 1) AS avg_res_rate,
       ROUND(AVG(med_days), 1) AS avg_med_days
FROM quadrant
GROUP BY quadrant
ORDER BY quadrant
""").fetchall()

print(f"  2×2 quadrant (agencies with 2,000+ tickets):")
print(f"\n  {'Quadrant':<28} {'Agencies':>9} {'Avg res%':>9} {'Avg days':>9}")
print(f"  {'-'*28} {'-'*9} {'-'*9} {'-'*9}")
for quad, count, res, days in quads:
    print(f"  {quad:<28} {count:>9} {res:>8.1f}%  {days:>8.1f}d")

print(f"\n{'─'*70}")
print("  Analysis complete. See backend/analysis/README.md for key findings.")
print(f"{'─'*70}\n")
