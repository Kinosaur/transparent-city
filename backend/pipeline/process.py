"""
Traffy Fondue Data Pipeline — Phase 1
Ingests all monthly CSVs → cleans → enriches → aggregates → exports JSON
"""

import glob
import json
import math
import os
from pathlib import Path

import numpy as np
import pandas as pd

# ─── Paths ────────────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent.parent / "data"
OUT_DIR = Path(__file__).parent.parent / "public" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

RESOLVED_STATE = "เสร็จสิ้น"
STALE_DAYS = 90

# ─── 1. INGEST ────────────────────────────────────────────────────────────────
print("▶ Loading CSVs...")
files = sorted(glob.glob(str(DATA_DIR / "bangkok_*.csv")))
print(f"  Found {len(files)} files")

dfs = []
for f in files:
    try:
        df = pd.read_csv(f, low_memory=False, encoding="utf-8-sig")
        dfs.append(df)
    except Exception as e:
        print(f"  ⚠ Skipped {os.path.basename(f)}: {e}")

raw = pd.concat(dfs, ignore_index=True)
print(f"  Total rows: {len(raw):,}")

# ─── 2. CLEAN ─────────────────────────────────────────────────────────────────
print("▶ Cleaning...")

df = raw.copy()

# Drop exact duplicates
df = df.drop_duplicates(subset=["ticket_id"])
print(f"  After dedup: {len(df):,}")

# Parse coords → lat, lon
def parse_coords(s):
    try:
        parts = str(s).split(",")
        return float(parts[0].strip()), float(parts[1].strip())
    except Exception:
        return np.nan, np.nan

df[["lon", "lat"]] = pd.DataFrame(
    df["coords"].map(parse_coords).tolist(), index=df.index
)

# Timestamps
ts_cols = ["timestamp", "last_activity", "timestamp_inprogress", "timestamp_finished"]
for col in ts_cols:
    df[col] = pd.to_datetime(df[col], errors="coerce", utc=False)

# Numeric
df["star"] = pd.to_numeric(df["star"], errors="coerce")
df["count_reopen"] = pd.to_numeric(df["count_reopen"], errors="coerce").fillna(0).astype(int)
df["duration_minutes_total"] = pd.to_numeric(df["duration_minutes_total"], errors="coerce")

# Keep only Bangkok province
df = df[df["province"].astype(str).str.strip() == "กรุงเทพมหานคร"]
print(f"  After province=Bangkok filter: {len(df):,}")

# District: drop rows without district (can't place them)
df = df[df["district"].notna() & (df["district"].str.strip() != "") & (df["district"].astype(str) != "nan")]
print(f"  After district filter: {len(df):,}")

# Fix known district name typo (truncated vs full)
df["district"] = df["district"].replace({"ป้อมปราบศัตรูพ่า": "ป้อมปราบศัตรูพ่าย"})

# Keep only the 50 official Bangkok districts
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
df = df[df["district"].isin(BANGKOK_50)]
print(f"  After Bangkok-50 allowlist: {len(df):,}")

# Strip whitespace from key string cols
for col in ["district", "subdistrict", "type", "state", "organization"]:
    df[col] = df[col].astype(str).str.strip()

# Normalize state
df["state"] = df["state"].replace({"nan": np.nan})

# ─── 3. ENRICH ────────────────────────────────────────────────────────────────
print("▶ Enriching...")

now = pd.Timestamp.now()

df["is_resolved"] = df["state"] == RESOLVED_STATE
df["resolution_days"] = df["duration_minutes_total"] / 1440.0

# Stale: not resolved + last_activity > STALE_DAYS ago (or no activity and old timestamp)
days_since_activity = (now - df["last_activity"]).dt.days
days_since_created = (now - df["timestamp"]).dt.days
df["is_stale"] = (
    (~df["is_resolved"])
    & (
        (days_since_activity > STALE_DAYS)
        | (days_since_activity.isna() & (days_since_created > STALE_DAYS))
    )
)

# Satisfaction bucket
df["satisfaction_bucket"] = pd.cut(
    df["star"],
    bins=[0, 2, 3.5, 5],
    labels=["low", "medium", "high"],
    include_lowest=True,
)

# Drop rows with unparseable timestamps (NaT)
df = df[df["timestamp"].notna()]

# Year-month for trend aggregation
df["ym"] = df["timestamp"].dt.to_period("M").astype(str)

# Has before/after photos
df["has_photos"] = df["photo"].notna() & df["photo_after"].notna()

# ─── 4. AGGREGATE & EXPORT ───────────────────────────────────────────────────

def safe_median(s):
    v = s.dropna()
    return round(float(v.median()), 1) if len(v) else None

def safe_mean(s):
    v = s.dropna()
    return round(float(v.mean()), 2) if len(v) else None

def pct(numerator, denominator):
    if denominator == 0:
        return None
    return round(numerator / denominator * 100, 1)

def assign_percentile_grades(district_list: list) -> None:
    """
    Assign A–F by percentile rank so grades spread meaningfully across 50 districts.
      Top 20 % → A  (~10)   50–80 % → B  (~15)
      20–50 % → C  (~15)    5–20 %  → D  (~7)   Bottom 5 % → F (~3)
    """
    valid = sorted(
        [d for d in district_list if d["composite_score"] is not None],
        key=lambda x: x["composite_score"],
        reverse=True,
    )
    n = len(valid)
    for i, d in enumerate(valid):
        pctile = 1.0 - (i / n)
        if pctile > 0.80:
            d["grade"] = "A"
        elif pctile > 0.50:
            d["grade"] = "B"
        elif pctile > 0.20:
            d["grade"] = "C"
        elif pctile > 0.05:
            d["grade"] = "D"
        else:
            d["grade"] = "F"
    for d in district_list:
        if d["composite_score"] is None:
            d["grade"] = "N/A"

def district_score(row):
    """
    Composite 0-100:
      40% resolution rate
      30% speed (inverted median days, capped at 30 days → score 0)
      20% satisfaction (avg star / 5 * 100)
      10% reopen rate (inverted)
    """
    parts = []

    res_rate = row.get("resolution_rate")
    if res_rate is not None:
        parts.append((res_rate, 40))

    med_days = row.get("median_resolution_days")
    if med_days is not None:
        speed_score = max(0, 100 - (med_days / 30) * 100)
        parts.append((speed_score, 30))

    avg_star = row.get("avg_satisfaction")
    if avg_star is not None:
        parts.append((avg_star / 5 * 100, 20))

    reopen_rate = row.get("reopen_rate")
    if reopen_rate is not None:
        parts.append((max(0, 100 - reopen_rate * 5), 10))  # 20% reopen = 0 score

    if not parts:
        return None

    total_weight = sum(w for _, w in parts)
    weighted = sum(s * w for s, w in parts)
    return round(weighted / total_weight, 1)


# ── 4a. Overview ──────────────────────────────────────────────────────────────
print("▶ Building overview.json...")

total = len(df)
resolved = df["is_resolved"].sum()
stale = df["is_stale"].sum()

overview = {
    "total_tickets": int(total),
    "resolved_tickets": int(resolved),
    "resolution_rate": pct(resolved, total),
    "pending_tickets": int((~df["is_resolved"]).sum()),
    "stale_tickets": int(stale),
    "stale_rate": pct(stale, total),
    "median_resolution_days": safe_median(df.loc[df["is_resolved"], "resolution_days"]),
    "avg_satisfaction": safe_mean(df["star"]),
    "avg_reopen_rate": safe_mean(df["count_reopen"]),
    "reopen_pct": pct(int((df["count_reopen"] > 0).sum()), total),
    "data_range": {
        "from": str(df["timestamp"].min().date()),
        "to": str(df["timestamp"].max().date()),
    },
}

# Top 10 problem types
type_grp = df.groupby("type")
type_stats = []
for t, g in type_grp:
    res = g["is_resolved"].sum()
    cnt = len(g)
    type_stats.append(
        {
            "type": t,
            "count": int(cnt),
            "resolution_rate": pct(res, cnt),
            "median_resolution_days": safe_median(g.loc[g["is_resolved"], "resolution_days"]),
        }
    )
type_stats.sort(key=lambda x: x["count"], reverse=True)
overview["top_problem_types"] = type_stats[:10]

# Monthly trend (all months)
monthly = df.groupby("ym").agg(
    total=("ticket_id", "count"),
    resolved=("is_resolved", "sum"),
    stale=("is_stale", "sum"),
    avg_star=("star", "mean"),
).reset_index()
monthly["pending"] = monthly["total"] - monthly["resolved"]
monthly["resolution_rate"] = (monthly["resolved"] / monthly["total"] * 100).round(1)
monthly["avg_star"] = monthly["avg_star"].round(2)
monthly = monthly.sort_values("ym")

overview["monthly_trends"] = json.loads(monthly.to_json(orient="records"))

with open(OUT_DIR / "overview.json", "w", encoding="utf-8") as f:
    json.dump(overview, f, ensure_ascii=False, indent=2)
print(f"  ✓ overview.json — {total:,} tickets")


# ── 4b. Districts ─────────────────────────────────────────────────────────────
print("▶ Building districts.json...")

district_list = []
for dist, g in df.groupby("district"):
    cnt = len(g)
    res_cnt = g["is_resolved"].sum()
    res_rate = pct(res_cnt, cnt)
    med_days = safe_median(g.loc[g["is_resolved"], "resolution_days"])
    avg_star = safe_mean(g["star"])
    stale_cnt = g["is_stale"].sum()
    reopen_cnt = (g["count_reopen"] > 0).sum()
    reopen_rate = pct(reopen_cnt, cnt)

    # Top 3 types
    top_types = (
        g["type"]
        .value_counts()
        .head(3)
        .reset_index()
        .rename(columns={"type": "type", "count": "count"})
        .to_dict(orient="records")
    )

    # Monthly trend for this district (last 12 months)
    dist_monthly = g.groupby("ym").agg(
        total=("ticket_id", "count"),
        resolved=("is_resolved", "sum"),
    ).reset_index().sort_values("ym").tail(12)
    dist_monthly["resolution_rate"] = (
        dist_monthly["resolved"] / dist_monthly["total"] * 100
    ).round(1)

    # Worst stale tickets (oldest 5 open)
    stale_df = g[g["is_stale"]].copy()
    stale_df["days_open"] = (now - stale_df["timestamp"]).dt.days
    worst = (
        stale_df.nlargest(5, "days_open")[
            ["ticket_id", "type", "days_open", "address", "last_activity"]
        ]
        .copy()
    )
    worst["last_activity"] = worst["last_activity"].astype(str)
    worst_records = worst.to_dict(orient="records")

    row = {
        "district": dist,
        "total_tickets": int(cnt),
        "resolved_tickets": int(res_cnt),
        "resolution_rate": res_rate,
        "median_resolution_days": med_days,
        "avg_satisfaction": avg_star,
        "stale_tickets": int(stale_cnt),
        "reopen_rate": reopen_rate,
        "top_types": top_types,
        "monthly_trend": json.loads(dist_monthly.to_json(orient="records")),
        "worst_stale": worst_records,
    }
    row["composite_score"] = district_score(row)
    row["grade"] = "N/A"  # assigned below via percentile
    district_list.append(row)

assign_percentile_grades(district_list)
district_list.sort(key=lambda x: x["total_tickets"], reverse=True)

with open(OUT_DIR / "districts.json", "w", encoding="utf-8") as f:
    json.dump(district_list, f, ensure_ascii=False, indent=2)
print(f"  ✓ districts.json — {len(district_list)} districts")


# ── 4c. Monthly trends (standalone for charting) ──────────────────────────────
print("▶ Building monthly_trends.json...")

with open(OUT_DIR / "monthly_trends.json", "w", encoding="utf-8") as f:
    json.dump(json.loads(monthly.to_json(orient="records")), f, ensure_ascii=False, indent=2)
print(f"  ✓ monthly_trends.json — {len(monthly)} months")


# ── 4d. Orgs (pre-compute for Phase 2 Leaderboard) ────────────────────────────
print("▶ Building orgs.json...")

org_list = []
for org, g in df.groupby("organization"):
    if org in ("nan", "", "None"):
        continue
    cnt = len(g)
    if cnt < 10:  # skip tiny entries (test data, etc.)
        continue
    res_cnt = g["is_resolved"].sum()
    org_list.append(
        {
            "organization": org,
            "total_tickets": int(cnt),
            "resolved_tickets": int(res_cnt),
            "resolution_rate": pct(res_cnt, cnt),
            "median_resolution_days": safe_median(
                g.loc[g["is_resolved"], "resolution_days"]
            ),
            "avg_satisfaction": safe_mean(g["star"]),
            "reopen_rate": pct(int((g["count_reopen"] > 0).sum()), cnt),
        }
    )

org_list.sort(key=lambda x: x["total_tickets"], reverse=True)
with open(OUT_DIR / "orgs.json", "w", encoding="utf-8") as f:
    json.dump(org_list, f, ensure_ascii=False, indent=2)
print(f"  ✓ orgs.json — {len(org_list)} organizations")


# ── 4e. Gallery (pre-compute for Phase 2 Gallery page) ────────────────────────
print("▶ Building gallery.json...")

gallery_df = df[
    df["has_photos"] & df["is_resolved"] & df["photo"].notna() & df["photo_after"].notna()
].copy()
gallery_df["days_to_resolve"] = gallery_df["resolution_days"].round(0).astype("Int64")
gallery_df["timestamp_str"] = gallery_df["timestamp"].dt.strftime("%Y-%m-%d")

gallery_sample = json.loads(
    gallery_df[
        ["ticket_id", "type", "district", "photo", "photo_after",
         "days_to_resolve", "star", "timestamp_str", "address"]
    ]
    .rename(columns={"timestamp_str": "reported_date"})
    .dropna(subset=["photo", "photo_after"])
    .sample(min(500, len(gallery_df)), random_state=42)
    .to_json(orient="records")   # NaN → null (valid JSON), unlike to_dict
)

with open(OUT_DIR / "gallery.json", "w", encoding="utf-8") as f:
    json.dump(gallery_sample, f, ensure_ascii=False, indent=2)
print(f"  ✓ gallery.json — {len(gallery_sample)} before/after pairs (from {len(gallery_df):,} total)")


# ── 4f. Map points (stale + low-satisfaction tickets with valid coords) ────────
print("▶ Building points.json...")

# Only tickets with valid coordinates
has_coords = df["lat"].notna() & df["lon"].notna()

# Stale tickets — take the oldest 15 000 (most compelling stories)
stale_pts = (
    df[has_coords & df["is_stale"]]
    .assign(days_open=lambda x: (now - x["timestamp"]).dt.days)
    .nlargest(15_000, "days_open")[["ticket_id", "lat", "lon", "type", "district", "days_open", "star"]]
    .copy()
)
stale_pts["flag"] = "stale"

# Low-satisfaction tickets (star ≤ 2, resolved so we know the outcome)
low_sat_pts = (
    df[has_coords & df["is_resolved"] & (df["star"] <= 2)]
    .assign(days_open=lambda x: (x["resolution_days"]).round(0))
    .sample(min(10_000, (has_coords & df["is_resolved"] & (df["star"] <= 2)).sum()), random_state=42)
    [["ticket_id", "lat", "lon", "type", "district", "days_open", "star"]]
    .copy()
)
low_sat_pts["flag"] = "low_sat"

points_df = (
    pd.concat([stale_pts, low_sat_pts])
    .drop_duplicates(subset=["ticket_id"])
    .reset_index(drop=True)
)
points_df["lat"] = points_df["lat"].round(5)
points_df["lon"] = points_df["lon"].round(5)
points_df["days_open"] = points_df["days_open"].where(points_df["days_open"].notna(), None)
points_df["star"] = points_df["star"].where(points_df["star"].notna(), None)

points_records = json.loads(points_df.to_json(orient="records"))

with open(OUT_DIR / "points.json", "w", encoding="utf-8") as f:
    json.dump(points_records, f, ensure_ascii=False)
print(f"  ✓ points.json — {len(points_records):,} map points ({stale_pts.shape[0]:,} stale + {low_sat_pts.shape[0]:,} low-sat)")


# ── Summary ───────────────────────────────────────────────────────────────────
print("\n✅ Pipeline complete. Outputs in public/data/:")
for p in sorted(OUT_DIR.glob("*.json")):
    size_kb = p.stat().st_size / 1024
    print(f"  {p.name:<30} {size_kb:>8.1f} KB")
