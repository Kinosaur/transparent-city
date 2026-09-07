"""
Traffy Fondue — Data Quality Checker
=====================================
Run this independently of the full pipeline to audit your local CSV files
or to check the JSON outputs that are committed to git.

Usage:
    # Check raw CSV inputs
    python backend/pipeline/validate.py --inputs

    # Check the pipeline JSON outputs
    python backend/pipeline/validate.py --outputs

    # Check both
    python backend/pipeline/validate.py

Why a separate script?
-----------------------
The main process.py runs validation as part of the pipeline, but sometimes you
want to check data quality *without* running the full pipeline (which can take
minutes on 49+ files). This script is fast and safe to run any time.
"""

import argparse
import csv
import json
import sys
from datetime import datetime
from pathlib import Path

from dateutil.relativedelta import relativedelta

from data_contract import input_contract_violations, output_contract_violations

# ─── Paths ────────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).parent.parent.parent
DATA_DIR  = REPO_ROOT / "backend" / "data"
OUT_DIR   = REPO_ROOT / "frontend" / "public" / "data"

# ─── Known constants (must match process.py) ─────────────────────────────────
EXPECTED_COLUMNS = {
    "ticket_id", "type", "organization", "organization_action", "comment",
    "coords", "photo", "photo_after", "address", "subdistrict", "district",
    "province", "timestamp", "state", "star", "count_reopen", "last_activity",
    "duration_minutes_inprogress", "duration_minutes_finished",
    "duration_minutes_total", "timestamp_inprogress", "timestamp_finished",
    "message_id", "problemtype_tag",
}

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

VALID_STATES = {"เสร็จสิ้น", "กำลังดำเนินการ", "รอรับเรื่อง"}


# ─── Utilities ────────────────────────────────────────────────────────────────

def ok(msg: str):    print(f"  ✅  {msg}")
def warn(msg: str):  print(f"  ⚠️   {msg}")
def fail(msg: str):  print(f"  ❌  {msg}")


def expected_months(from_ym: str, to_ym: str) -> list[str]:
    """Return every YYYY-MM between from_ym and to_ym inclusive."""
    start = datetime.strptime(from_ym, "%Y-%m")
    end   = datetime.strptime(to_ym,   "%Y-%m")
    months = []
    cur = start
    while cur <= end:
        months.append(cur.strftime("%Y-%m"))
        cur += relativedelta(months=1)
    return months


# ─── Check 1: Raw CSV inputs ──────────────────────────────────────────────────

def check_inputs() -> int:
    """Validate all CSV files in backend/data/. Returns number of failures."""
    print("\n📂  Checking raw CSV inputs in", DATA_DIR)
    files = sorted(DATA_DIR.glob("bangkok_*.csv"))

    if not files:
        fail("No CSV files found. Run 'python download.py --all' first.")
        return 1

    errors = 0
    months_present = []

    for f in files:
        ym = f.stem.replace("bangkok_", "")
        months_present.append(ym)

        # 1a. Column schema
        with open(f, encoding="utf-8-sig") as fh:
            header = next(csv.reader(fh))
        actual = set(header)
        missing = EXPECTED_COLUMNS - actual
        extra   = actual - EXPECTED_COLUMNS

        if missing:
            fail(f"{ym}: missing columns → {missing}")
            errors += 1
        if extra:
            warn(f"{ym}: new/unexpected columns → {extra}")

        # 1b. Row count
        with open(f, encoding="utf-8-sig") as fh:
            row_count = sum(1 for _ in fh) - 1  # subtract header

        if row_count == 0:
            fail(f"{ym}: empty file (0 data rows)")
            errors += 1
        elif row_count < 100:
            warn(f"{ym}: very few rows ({row_count}) — pilot data or bad download?")
        else:
            size_mb = f.stat().st_size / 1_048_576
            ok(f"{ym}: {row_count:>7,} rows  ({size_mb:.1f} MB)")

    # 1c. Time-series completeness — gaps mean missing months of data
    print()
    gaps = set(expected_months(months_present[0], months_present[-1])) - set(months_present)
    if gaps:
        warn(f"Gaps in monthly time series: {sorted(gaps)}")
        warn("  Run: python download.py --all   to fill them in")
    else:
        ok(f"Monthly time series is complete: {months_present[0]} → {months_present[-1]}")

    # 1d. How current is the data?
    latest_ym = months_present[-1]
    latest_dt = datetime.strptime(latest_ym, "%Y-%m")
    now = datetime.now()
    months_behind = (now.year - latest_dt.year) * 12 + (now.month - latest_dt.month)
    if months_behind == 0:
        ok("Data is current (latest month is the current calendar month)")
    elif months_behind <= 2:
        warn(f"Data is {months_behind} month(s) behind current date")
    else:
        fail(f"Data is {months_behind} months behind — GitHub Actions may not be running")
        errors += 1

    # 1e. Historical coverage contract — this is intentionally stricter than
    # gap detection above. It protects the published corpus from a cache miss
    # or a partial refresh while allowing the documented legacy inventory to be
    # improved over time.
    contract_violations = input_contract_violations(set(months_present))
    for violation in contract_violations:
        fail(f"Data contract: {violation}")
        errors += 1

    return errors


# ─── Check 2: Pipeline JSON outputs ───────────────────────────────────────────

def check_outputs() -> int:
    """Validate the JSON files that the pipeline writes to frontend/public/data/."""
    print("\n📊  Checking pipeline JSON outputs in", OUT_DIR)
    errors = 0

    # ── overview.json ─────────────────────────────────────────────────────────
    overview_path = OUT_DIR / "overview.json"
    if not overview_path.exists():
        fail("overview.json not found — has the pipeline been run?")
        return 1

    with open(overview_path) as f:
        ov = json.load(f)

    required_ov = ["total_tickets", "resolved_tickets", "resolution_rate",
                   "stale_tickets", "data_range", "top_problem_types", "monthly_trends"]
    for key in required_ov:
        if key not in ov:
            fail(f"overview.json missing key: {key}")
            errors += 1

    if ov.get("total_tickets", 0) < 100_000:
        warn(f"overview total_tickets seems low: {ov.get('total_tickets'):,}")
    else:
        ok(f"overview.json: {ov['total_tickets']:,} total tickets")

    res_rate = ov.get("resolution_rate", 0)
    if not (50 <= res_rate <= 95):
        warn(f"resolution_rate {res_rate}% is outside expected range 50–95%")
    else:
        ok(f"overview.json: resolution rate {res_rate}% (expected 50–95%)")

    # ── districts.json ────────────────────────────────────────────────────────
    districts_path = OUT_DIR / "districts.json"
    if not districts_path.exists():
        fail("districts.json not found")
        errors += 1
    else:
        with open(districts_path) as f:
            districts = json.load(f)

        if len(districts) != 50:
            fail(f"districts.json has {len(districts)} districts — expected 50")
            errors += 1
        else:
            ok(f"districts.json: 50 districts ✓")

        grades = [d["grade"] for d in districts]
        grade_counts = {g: grades.count(g) for g in "ABCDF"}
        ok(f"districts.json grade distribution: {grade_counts}")

        # No district should have a negative resolution days
        bad = [d["district"] for d in districts
               if d.get("median_resolution_days") is not None
               and d["median_resolution_days"] < 0]
        if bad:
            fail(f"Negative median_resolution_days in: {bad}")
            errors += 1
        else:
            ok("No negative resolution times ✓")

        # Every district in the output should be a known Bangkok district
        unknown = {d["district"] for d in districts} - BANGKOK_50
        if unknown:
            fail(f"Unknown districts in output: {unknown}")
            errors += 1

    # ── orgs.json ─────────────────────────────────────────────────────────────
    orgs_path = OUT_DIR / "orgs.json"
    if not orgs_path.exists():
        fail("orgs.json not found")
        errors += 1
    else:
        with open(orgs_path) as f:
            orgs = json.load(f)
        if len(orgs) < 5:
            warn(f"orgs.json has very few entries: {len(orgs)}")
        else:
            ok(f"orgs.json: {len(orgs)} organizations")

    # ── gallery.json ──────────────────────────────────────────────────────────
    gallery_path = OUT_DIR / "gallery.json"
    if not gallery_path.exists():
        fail("gallery.json not found")
        errors += 1
    else:
        with open(gallery_path) as f:
            gallery = json.load(f)
        # Every gallery item must have both photo URLs
        missing_photos = [g["ticket_id"] for g in gallery
                         if not g.get("photo") or not g.get("photo_after")]
        if missing_photos:
            fail(f"gallery.json: {len(missing_photos)} items missing photo/photo_after")
            errors += 1
        else:
            ok(f"gallery.json: {len(gallery)} items, all have photo pairs ✓")

    # ── data_profile.json (optional but useful) ───────────────────────────────
    profile_path = OUT_DIR / "data_profile.json"
    if profile_path.exists():
        with open(profile_path) as f:
            profile = json.load(f)
        ok(f"data_profile.json: generated at {profile.get('generated_at', 'unknown')}")
    else:
        warn("data_profile.json not found — run the pipeline to generate it")
        profile = None

    for violation in output_contract_violations(ov, profile):
        fail(f"Data contract: {violation}")
        errors += 1

    # ── File sizes ────────────────────────────────────────────────────────────
    print()
    print("  Output file sizes:")
    for p in sorted(OUT_DIR.glob("*.json")):
        size_kb = p.stat().st_size / 1024
        print(f"    {p.name:<35} {size_kb:>8.1f} KB")

    return errors


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Traffy Fondue data quality checker")
    parser.add_argument("--inputs",  action="store_true", help="Check raw CSV files")
    parser.add_argument("--outputs", action="store_true", help="Check pipeline JSON outputs")
    args = parser.parse_args()

    # Default: check both if neither flag given
    check_both = not args.inputs and not args.outputs

    total_errors = 0
    if args.inputs or check_both:
        total_errors += check_inputs()
    if args.outputs or check_both:
        total_errors += check_outputs()

    print()
    if total_errors == 0:
        print("✅  All checks passed.")
    else:
        print(f"❌  {total_errors} check(s) failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
