"""
Traffy Fondue Data Pipeline
============================
Ingests monthly Bangkok CSVs → cleans → validates → enriches → aggregates → exports JSON.

Architecture (Medallion pattern):
  Bronze  — raw CSV ingestion, dedup, schema validation
  Silver  — cleaned & enriched DataFrame (coordinates, timestamps, derived flags)
  Gold    — SQL aggregations via DuckDB → JSON outputs served by the frontend

Why DuckDB for the Gold layer?
  - SQL is the lingua franca of data engineering; readable, testable, portable
  - DuckDB runs in-process (no server), reads pandas DataFrames natively
  - Window functions (PARTITION BY, ROW_NUMBER) express complex analytics cleanly
  - Aggregations on 1M+ rows run in seconds vs minutes in pure Python loops

Run:
    python backend/pipeline/process.py
"""

import glob
import json
import logging
import os
import sys
import time
from contextlib import contextmanager
from pathlib import Path

import math

import duckdb
import numpy as np
import pandas as pd

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("pipeline")


def nan_to_none(obj):
    """Recursively replace float NaN/Inf with None so json.dump produces valid JSON."""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: nan_to_none(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [nan_to_none(v) for v in obj]
    return obj


@contextmanager
def timed_step(name: str):
    """Log start/end and elapsed time for any pipeline step."""
    t0 = time.perf_counter()
    log.info("▶  %s", name)
    yield
    log.info("   ✓ done in %.1fs", time.perf_counter() - t0)


# ─── Paths & constants ────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent.parent / "data"
OUT_DIR  = Path(__file__).parent.parent / "public" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

RESOLVED_STATE = "เสร็จสิ้น"
STALE_DAYS     = 90

BANGKOK_50 = {
    "พระนคร", "ดุสิต", "หนองจอก", "บางรัก", "บางเขน", "ลาดกระบัง", "ยานนาวา",
    "สัมพันธวงศ์", "พระโขนง", "มีนบุรี", "ลาดพร้าว", "วังทองหลาง", "คลองสาน",
    "ตลิ่งชัน", "บางกอกน้อย", "บางขุนเทียน", "ภาษีเจริญ", "หนองแขม",
    "ราษฎร์บูรณะ", "หลักสี่", "คลองเตย", "สวนหลวง", "จอมทอง", "ดอนเมือง",
    "ราชเทวี", "บึงกุ่ม", "สาทร", "บางซื่อ", "จตุจักร", "ดินแดง",
    "บางกอกใหญ่", "ห้วยขวาง", "คลองสามวา", "บางนา", "ทวีวัฒนา", "ทุ่งครุ",
    "บางบอน", "ประเวศ", "สะพานสูง", "ป้อมปราบศัตรูพ่าย", "พญาไท", "ธนบุรี",
    "บางกะปิ", "วัฒนา", "บางพลัด", "คันนายาว", "สายไหม", "ปทุมวัน",
    "บางแค", "บางคอแหลม",
}

EXPECTED_COLUMNS = {
    "ticket_id", "type", "organization", "organization_action", "comment",
    "coords", "photo", "photo_after", "address", "subdistrict", "district",
    "province", "timestamp", "state", "star", "count_reopen", "last_activity",
    "duration_minutes_inprogress", "duration_minutes_finished",
    "duration_minutes_total", "timestamp_inprogress", "timestamp_finished",
    "message_id", "problemtype_tag",
}


# ─── Helper: coordinate parser ────────────────────────────────────────────────

def parse_coords(s: str) -> tuple[float, float]:
    """
    Traffy stores coords as 'lon,lat' — not the usual lat,lon order.
    '0.00000,0.00000' means the citizen didn't share location; we return NaN.
    """
    try:
        parts = str(s).split(",")
        lon, lat = float(parts[0].strip()), float(parts[1].strip())
        if lon == 0.0 and lat == 0.0:
            return np.nan, np.nan
        return lon, lat
    except Exception:
        return np.nan, np.nan


# ─── Helper: input validation ─────────────────────────────────────────────────

def validate_inputs(files: list[str]) -> dict:
    """Schema and quality checks on raw CSVs before loading. Fail fast."""
    import csv
    from datetime import datetime
    from dateutil.relativedelta import relativedelta

    log.info("▶  Validating %d input files...", len(files))
    issues = []
    file_stats = []

    for f in files:
        ym = Path(f).stem.replace("bangkok_", "")
        with open(f, encoding="utf-8-sig") as fh:
            header = fh.readline().strip().split(",")
            row_count = sum(1 for _ in fh)

        actual_cols = set(header)
        missing = EXPECTED_COLUMNS - actual_cols
        extra   = actual_cols - EXPECTED_COLUMNS

        file_stats.append({"month": ym, "rows": row_count,
                            "missing_columns": sorted(missing),
                            "extra_columns": sorted(extra)})

        if missing:
            issues.append(f"{ym}: missing columns {missing}")
            log.warning("  %s — missing columns: %s", ym, missing)
        if extra:
            log.info("  %s — new columns (schema evolved?): %s", ym, extra)
        if row_count < 100:
            log.warning("  %s — only %d rows (pilot data?)", ym, row_count)

    # Time-series gap detection
    months_present = {s["month"] for s in file_stats}
    all_ym = sorted(months_present)
    if all_ym:
        start = datetime.strptime(all_ym[0], "%Y-%m")
        end   = datetime.strptime(all_ym[-1], "%Y-%m")
        expected, cur = set(), start
        while cur <= end:
            expected.add(cur.strftime("%Y-%m"))
            cur += relativedelta(months=1)
        gaps = sorted(expected - months_present)
        if gaps:
            log.warning("  Missing months in time series: %s", gaps)
        else:
            log.info("  Time series complete: %s → %s", all_ym[0], all_ym[-1])

    log.info("   ✓ Validation — %d issue(s)", len(issues))
    return {"file_stats": file_stats, "issues": issues}


# ══════════════════════════════════════════════════════════════════════════════
# BRONZE — Raw ingestion
# ══════════════════════════════════════════════════════════════════════════════

with timed_step("Bronze: ingest CSVs"):
    files = sorted(glob.glob(str(DATA_DIR / "bangkok_*.csv")))
    log.info("   Found %d CSV files", len(files))

    if not files:
        log.error("No CSV files found. Run download.py first.")
        sys.exit(0)

    validation_report = validate_inputs(files)

    dfs, load_errors = [], []
    for f in files:
        try:
            dfs.append(pd.read_csv(f, low_memory=False, encoding="utf-8-sig"))
        except Exception as e:
            load_errors.append(f)
            log.error("  Skipped %s: %s", os.path.basename(f), e)

    if not dfs:
        log.error("All files failed to load.")
        sys.exit(1)

    raw = pd.concat(dfs, ignore_index=True)
    log.info("   %d files → %d rows", len(dfs), len(raw))


# ══════════════════════════════════════════════════════════════════════════════
# SILVER — Clean & enrich
# ══════════════════════════════════════════════════════════════════════════════

with timed_step("Silver: clean & enrich"):
    df = raw.copy()
    n0 = len(df)

    df = df.drop_duplicates(subset=["ticket_id"])
    log.info("   Dedup:           %d → %d (-%d)", n0, len(df), n0 - len(df))

    # Coordinates: "lon,lat" string → separate float columns; 0,0 → NaN
    coords = df["coords"].map(parse_coords).tolist()
    df[["lon", "lat"]] = pd.DataFrame(coords, index=df.index)
    n_null_coords = int(df["lat"].isna().sum())
    log.info("   Valid coords:    %d (%.1f%% null)",
             len(df) - n_null_coords, n_null_coords / len(df) * 100)

    # Timestamps
    for col in ["timestamp", "last_activity", "timestamp_inprogress", "timestamp_finished"]:
        df[col] = pd.to_datetime(df[col], errors="coerce", utc=False)

    # Numeric
    df["star"]                    = pd.to_numeric(df["star"], errors="coerce")
    df["count_reopen"]            = pd.to_numeric(df["count_reopen"], errors="coerce").fillna(0).astype(int)
    df["duration_minutes_total"]  = pd.to_numeric(df["duration_minutes_total"], errors="coerce")

    # Filter to Bangkok province and valid district
    n_before = len(df)
    df = df[df["province"].astype(str).str.strip() == "กรุงเทพมหานคร"]
    log.info("   Bangkok filter:  %d → %d (-%d non-BKK)", n_before, len(df), n_before - len(df))

    n_before = len(df)
    df = df[df["district"].notna() & (df["district"].str.strip() != "") & (df["district"].astype(str) != "nan")]
    log.info("   District filter: %d → %d (-%d missing)", n_before, len(df), n_before - len(df))

    df["district"] = df["district"].replace({"ป้อมปราบศัตรูพ่า": "ป้อมปราบศัตรูพ่าย"})

    n_before = len(df)
    df = df[df["district"].isin(BANGKOK_50)]
    log.info("   BKK-50 filter:   %d → %d (-%d unknown)", n_before, len(df), n_before - len(df))

    for col in ["district", "subdistrict", "type", "state", "organization"]:
        df[col] = df[col].astype(str).str.strip()
    df["state"] = df["state"].replace({"nan": np.nan})

    n_before = len(df)
    df = df[df["timestamp"].notna()]
    log.info("   Timestamp filter:%d → %d (-%d null ts)", n_before, len(df), n_before - len(df))

    # Derived columns used by the Gold layer
    now = pd.Timestamp.now()
    df["is_resolved"]    = df["state"] == RESOLVED_STATE
    df["resolution_days"] = df["duration_minutes_total"] / 1440.0

    days_since_activity = (now - df["last_activity"]).dt.days
    days_since_created  = (now - df["timestamp"]).dt.days
    df["is_stale"] = (
        (~df["is_resolved"])
        & (
            (days_since_activity > STALE_DAYS)
            | (days_since_activity.isna() & (days_since_created > STALE_DAYS))
        )
    )
    df["days_open"] = days_since_created
    df["ym"]        = df["timestamp"].dt.to_period("M").astype(str)
    df["has_photos"] = df["photo"].notna() & df["photo_after"].notna()

    # Sanity checks
    unknown_states = set(df["state"].dropna().unique()) - {"เสร็จสิ้น", "กำลังดำเนินการ", "รอรับเรื่อง"}
    if unknown_states:
        log.warning("   Unexpected states: %s", unknown_states)
    missing_districts = BANGKOK_50 - set(df["district"].unique())
    if missing_districts:
        log.warning("   Districts with zero tickets: %s", missing_districts)

    log.info("   Silver rows: %d  |  resolution %.1f%%  |  stale %.1f%%",
             len(df),
             df["is_resolved"].mean() * 100,
             df["is_stale"].mean() * 100)


# ══════════════════════════════════════════════════════════════════════════════
# GOLD — SQL analytics via DuckDB
# ══════════════════════════════════════════════════════════════════════════════
#
# We register the cleaned DataFrame as a DuckDB table and run SQL queries.
# This is a common production pattern: Python for messy ETL, SQL for analytics.
#
# Concepts demonstrated:
#   - CTEs (WITH clauses) for readable multi-step queries
#   - Window functions (ROW_NUMBER, PARTITION BY) for per-group top-N
#   - QUALIFY to filter on window results without a subquery
#   - MEDIAN, PERCENTILE_CONT for statistical aggregations

with timed_step("Gold: register Silver table in DuckDB"):
    con = duckdb.connect()
    con.register("tickets", df)
    total_rows = con.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
    log.info("   %d rows available via SQL", total_rows)


# ── Gold 1: Overview ───────────────────────────────────────────────────────────

with timed_step("Gold: build overview.json"):
    overview_row = con.execute("""
        SELECT
            COUNT(*)                                                      AS total_tickets,
            SUM(is_resolved::INT)                                         AS resolved_tickets,
            COUNT(*) - SUM(is_resolved::INT)                              AS pending_tickets,
            ROUND(SUM(is_resolved::INT) * 100.0 / COUNT(*), 1)           AS resolution_rate,
            SUM(is_stale::INT)                                            AS stale_tickets,
            ROUND(SUM(is_stale::INT) * 100.0 / COUNT(*), 1)              AS stale_rate,
            ROUND(MEDIAN(CASE WHEN is_resolved THEN resolution_days END), 1)
                                                                          AS median_resolution_days,
            ROUND(AVG(star), 2)                                           AS avg_satisfaction,
            ROUND(AVG(count_reopen), 2)                                   AS avg_reopen_rate,
            ROUND(SUM(CASE WHEN count_reopen > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1)
                                                                          AS reopen_pct,
            MIN(CAST("timestamp" AS DATE))::VARCHAR                      AS date_from,
            MAX(CAST("timestamp" AS DATE))::VARCHAR                      AS date_to
        FROM tickets
    """).fetchone()

    (total, resolved, pending, res_rate, stale, stale_rate,
     med_days, avg_sat, avg_reopen, reopen_pct, date_from, date_to) = overview_row

    # Top 10 problem types by volume
    top_types = con.execute("""
        SELECT
            type,
            COUNT(*)                                                             AS count,
            ROUND(SUM(is_resolved::INT) * 100.0 / COUNT(*), 1)                  AS resolution_rate,
            ROUND(MEDIAN(CASE WHEN is_resolved THEN resolution_days END), 1)     AS median_resolution_days
        FROM tickets
        GROUP BY type
        ORDER BY count DESC
        LIMIT 10
    """).df().to_dict(orient="records")

    # Monthly trend (all months)
    monthly = con.execute("""
        SELECT
            ym,
            COUNT(*)                                                     AS total,
            SUM(is_resolved::INT)                                        AS resolved,
            SUM(is_stale::INT)                                           AS stale,
            ROUND(AVG(star), 2)                                          AS avg_star,
            COUNT(*) - SUM(is_resolved::INT)                             AS pending,
            ROUND(SUM(is_resolved::INT) * 100.0 / COUNT(*), 1)          AS resolution_rate
        FROM tickets
        GROUP BY ym
        ORDER BY ym
    """).df().to_dict(orient="records")

    overview = {
        "total_tickets":          int(total),
        "resolved_tickets":       int(resolved),
        "resolution_rate":        res_rate,
        "pending_tickets":        int(pending),
        "stale_tickets":          int(stale),
        "stale_rate":             stale_rate,
        "median_resolution_days": med_days,
        "avg_satisfaction":       avg_sat,
        "avg_reopen_rate":        avg_reopen,
        "reopen_pct":             reopen_pct,
        "data_range":             {"from": date_from, "to": date_to},
        "top_problem_types":      top_types,
        "monthly_trends":         monthly,
    }
    with open(OUT_DIR / "overview.json", "w", encoding="utf-8") as f:
        json.dump(nan_to_none(overview), f, ensure_ascii=False, indent=2)
    log.info("   overview.json — %d tickets, %d months", total, len(monthly))


# ── Gold 2: Districts ──────────────────────────────────────────────────────────

with timed_step("Gold: build districts.json"):

    # Core per-district stats
    district_stats = con.execute("""
        SELECT
            district,
            COUNT(*)                                                             AS total_tickets,
            SUM(is_resolved::INT)                                                AS resolved_tickets,
            ROUND(SUM(is_resolved::INT) * 100.0 / COUNT(*), 1)                  AS resolution_rate,
            ROUND(MEDIAN(CASE WHEN is_resolved THEN resolution_days END), 1)     AS median_resolution_days,
            ROUND(AVG(star), 2)                                                  AS avg_satisfaction,
            SUM(is_stale::INT)                                                   AS stale_tickets,
            ROUND(SUM(CASE WHEN count_reopen > 0 THEN 1 ELSE 0 END) * 100.0
                  / COUNT(*), 1)                                                 AS reopen_rate
        FROM tickets
        GROUP BY district
        ORDER BY total_tickets DESC
    """).df()

    # Top 3 problem types per district using QUALIFY + window function
    # QUALIFY filters on the window result without needing a subquery — clean DuckDB syntax
    top_types_df = con.execute("""
        SELECT district, type, COUNT(*) AS count
        FROM tickets
        GROUP BY district, type
        QUALIFY ROW_NUMBER() OVER (PARTITION BY district ORDER BY COUNT(*) DESC) <= 3
        ORDER BY district, count DESC
    """).df()

    # Monthly trend per district (last 12 months) using QUALIFY
    dist_monthly_df = con.execute("""
        SELECT district, ym,
               COUNT(*)                                                  AS total,
               SUM(is_resolved::INT)                                     AS resolved,
               ROUND(SUM(is_resolved::INT) * 100.0 / COUNT(*), 1)       AS resolution_rate
        FROM tickets
        GROUP BY district, ym
        QUALIFY ROW_NUMBER() OVER (PARTITION BY district ORDER BY ym DESC) <= 12
        ORDER BY district, ym
    """).df()

    # Worst stale tickets: top 5 per district ordered by days_open DESC
    # Using a CTE + ROW_NUMBER window function — a core DE pattern
    worst_stale_df = con.execute("""
        WITH stale_ranked AS (
            SELECT
                ticket_id,
                type,
                district,
                address,
                CAST("last_activity" AS VARCHAR)  AS last_activity,
                days_open,
                ROW_NUMBER() OVER (
                    PARTITION BY district
                    ORDER BY days_open DESC
                ) AS rn
            FROM tickets
            WHERE is_stale = TRUE
        )
        SELECT ticket_id, type, district, address, last_activity, days_open
        FROM stale_ranked
        WHERE rn <= 5
        ORDER BY district, days_open DESC
    """).df()

    # Grading — percentile-based, stays in Python (custom business logic)
    def district_score(row: dict) -> float | None:
        """
        Composite 0–100:  40% resolution  30% speed  20% satisfaction  10% reopen
        Weights are renormalised when a metric is missing (e.g. no star ratings).
        """
        parts = []
        if row.get("resolution_rate") is not None:
            parts.append((row["resolution_rate"], 40))
        if row.get("median_resolution_days") is not None:
            parts.append((max(0.0, 100.0 - (row["median_resolution_days"] / 30.0) * 100.0), 30))
        if row.get("avg_satisfaction") is not None:
            parts.append((row["avg_satisfaction"] / 5.0 * 100.0, 20))
        if row.get("reopen_rate") is not None:
            parts.append((max(0.0, 100.0 - row["reopen_rate"] * 5.0), 10))
        if not parts:
            return None
        total_w = sum(w for _, w in parts)
        return round(sum(s * w for s, w in parts) / total_w, 1)

    def assign_grades(district_list: list) -> None:
        """Percentile rank: A=top 20%, B=50-80%, C=20-50%, D=5-20%, F=bottom 5%."""
        valid = sorted(
            [d for d in district_list if d["composite_score"] is not None],
            key=lambda x: x["composite_score"], reverse=True,
        )
        n = len(valid)
        for i, d in enumerate(valid):
            pct = 1.0 - (i / n)
            d["grade"] = "A" if pct > 0.80 else "B" if pct > 0.50 else "C" if pct > 0.20 else "D" if pct > 0.05 else "F"
        for d in district_list:
            if d["composite_score"] is None:
                d["grade"] = "N/A"

    # Assemble district records
    top_types_by_district    = top_types_df.groupby("district").apply(
        lambda g: g[["type", "count"]].to_dict(orient="records"), include_groups=False
    ).to_dict()
    dist_monthly_by_district = dist_monthly_df.groupby("district").apply(
        lambda g: g[["ym", "total", "resolved", "resolution_rate"]].to_dict(orient="records"),
        include_groups=False,
    ).to_dict()
    worst_by_district        = worst_stale_df.groupby("district").apply(
        lambda g: g[["ticket_id", "type", "days_open", "address", "last_activity"]].to_dict(orient="records"),
        include_groups=False,
    ).to_dict()

    district_list = []
    for _, row in district_stats.iterrows():
        dist = row["district"]
        rec = {
            "district":                dist,
            "total_tickets":           int(row["total_tickets"]),
            "resolved_tickets":        int(row["resolved_tickets"]),
            "resolution_rate":         row["resolution_rate"],
            "median_resolution_days":  row["median_resolution_days"],
            "avg_satisfaction":        row["avg_satisfaction"],
            "stale_tickets":           int(row["stale_tickets"]),
            "reopen_rate":             row["reopen_rate"],
            "top_types":               top_types_by_district.get(dist, []),
            "monthly_trend":           dist_monthly_by_district.get(dist, []),
            "worst_stale":             worst_by_district.get(dist, []),
        }
        rec["composite_score"] = district_score(rec)
        rec["grade"] = "N/A"
        district_list.append(rec)

    assign_grades(district_list)

    grade_counts = {}
    for d in district_list:
        grade_counts[d["grade"]] = grade_counts.get(d["grade"], 0) + 1

    with open(OUT_DIR / "districts.json", "w", encoding="utf-8") as f:
        json.dump(nan_to_none(district_list), f, ensure_ascii=False, indent=2)
    log.info("   districts.json — %d districts  grades: %s",
             len(district_list),
             " ".join(f"{g}={c}" for g, c in sorted(grade_counts.items())))


# ── Gold 3: Monthly trends (standalone) ───────────────────────────────────────

with timed_step("Gold: build monthly_trends.json"):
    with open(OUT_DIR / "monthly_trends.json", "w", encoding="utf-8") as f:
        json.dump(nan_to_none(monthly), f, ensure_ascii=False, indent=2)
    log.info("   monthly_trends.json — %d months", len(monthly))


# ── Gold 4: Orgs ──────────────────────────────────────────────────────────────

with timed_step("Gold: build orgs.json"):
    orgs = con.execute("""
        SELECT
            organization,
            COUNT(*)                                                             AS total_tickets,
            SUM(is_resolved::INT)                                                AS resolved_tickets,
            ROUND(SUM(is_resolved::INT) * 100.0 / COUNT(*), 1)                  AS resolution_rate,
            ROUND(MEDIAN(CASE WHEN is_resolved THEN resolution_days END), 1)     AS median_resolution_days,
            ROUND(AVG(star), 2)                                                  AS avg_satisfaction,
            ROUND(SUM(CASE WHEN count_reopen > 0 THEN 1 ELSE 0 END) * 100.0
                  / COUNT(*), 1)                                                 AS reopen_rate
        FROM tickets
        WHERE organization NOT IN ('nan', '', 'None')
        GROUP BY organization
        HAVING COUNT(*) >= 10
        ORDER BY total_tickets DESC
    """).df().to_dict(orient="records")

    with open(OUT_DIR / "orgs.json", "w", encoding="utf-8") as f:
        json.dump(nan_to_none(orgs), f, ensure_ascii=False, indent=2)
    log.info("   orgs.json — %d organizations", len(orgs))


# ── Gold 5: Gallery ────────────────────────────────────────────────────────────
# Sampling stays in pandas — random_state reproducibility is easier there.

with timed_step("Gold: build gallery.json"):
    gallery_df = df[
        df["has_photos"] & df["is_resolved"] & df["photo"].notna() & df["photo_after"].notna()
    ].copy()
    gallery_df["days_to_resolve"] = gallery_df["resolution_days"].round(0).astype("Int64")
    gallery_df["timestamp_str"]   = gallery_df["timestamp"].dt.strftime("%Y-%m-%d")

    gallery = json.loads(
        gallery_df[["ticket_id", "type", "district", "photo", "photo_after",
                    "days_to_resolve", "star", "timestamp_str", "address"]]
        .rename(columns={"timestamp_str": "reported_date"})
        .dropna(subset=["photo", "photo_after"])
        .sample(min(500, len(gallery_df)), random_state=42)
        .to_json(orient="records")
    )
    with open(OUT_DIR / "gallery.json", "w", encoding="utf-8") as f:
        json.dump(nan_to_none(gallery), f, ensure_ascii=False, indent=2)
    log.info("   gallery.json — %d samples from %d eligible", len(gallery), len(gallery_df))


# ── Gold 6: Map points ─────────────────────────────────────────────────────────

with timed_step("Gold: build points.json"):
    has_coords = df["lat"].notna() & df["lon"].notna()

    stale_pts = (
        df[has_coords & df["is_stale"]]
        .nlargest(15_000, "days_open")
        [["ticket_id", "lat", "lon", "type", "district", "days_open", "star"]]
        .copy()
    )
    stale_pts["flag"] = "stale"

    low_sat_mask = has_coords & df["is_resolved"] & (df["star"] <= 2)
    low_sat_pts = (
        df[low_sat_mask]
        .assign(days_open=lambda x: x["resolution_days"].round(0))
        .sample(min(10_000, low_sat_mask.sum()), random_state=42)
        [["ticket_id", "lat", "lon", "type", "district", "days_open", "star"]]
        .copy()
    )
    low_sat_pts["flag"] = "low_sat"

    points_df = (
        pd.concat([stale_pts, low_sat_pts])
        .drop_duplicates(subset=["ticket_id"])
        .reset_index(drop=True)
    )
    points_df["lat"]      = points_df["lat"].round(5)
    points_df["lon"]      = points_df["lon"].round(5)
    points_df["days_open"] = points_df["days_open"].where(points_df["days_open"].notna(), None)
    points_df["star"]     = points_df["star"].where(points_df["star"].notna(), None)

    points = json.loads(points_df.to_json(orient="records"))
    with open(OUT_DIR / "points.json", "w", encoding="utf-8") as f:
        json.dump(nan_to_none(points), f, ensure_ascii=False)
    log.info("   points.json — %d stale + %d low-sat = %d total",
             len(stale_pts), len(low_sat_pts), len(points))


# ── Gold 7: Data profile ───────────────────────────────────────────────────────

with timed_step("Gold: build data_profile.json"):
    profile = {
        "generated_at":    pd.Timestamp.now().isoformat(),
        "pipeline_version": "3.0",
        "stack": {
            "etl":       "pandas (Bronze→Silver)",
            "analytics": "DuckDB SQL (Silver→Gold)",
        },
        "input": {
            "csv_files":   len(files),
            "load_errors": len(load_errors),
            "date_range": {
                "from": Path(files[0]).stem.replace("bangkok_", ""),
                "to":   Path(files[-1]).stem.replace("bangkok_", ""),
            },
            "validation_issues": validation_report["issues"],
        },
        "after_clean": {
            "total_rows":      len(df),
            "unique_districts": int(df["district"].nunique()),
            "unique_orgs":     int(df["organization"].nunique()),
        },
        "quality": {
            "null_coords_pct": round(df["lat"].isna().mean() * 100, 1),
            "null_star_pct":   round(df["star"].isna().mean() * 100, 1),
            "state_distribution": {
                s: int(c) for s, c in df["state"].value_counts().items()
            },
            "grade_distribution": grade_counts,
        },
        "outputs": {
            p.name: {"size_kb": round(p.stat().st_size / 1024, 1)}
            for p in sorted(OUT_DIR.glob("*.json"))
            if p.name != "data_profile.json"
        },
    }
    with open(OUT_DIR / "data_profile.json", "w", encoding="utf-8") as f:
        json.dump(nan_to_none(profile), f, ensure_ascii=False, indent=2)
    log.info("   data_profile.json written")


log.info("")
log.info("✅  Pipeline complete — outputs in %s", OUT_DIR)
for p in sorted(OUT_DIR.glob("*.json")):
    log.info("   %-35s %8.1f KB", p.name, p.stat().st_size / 1024)
