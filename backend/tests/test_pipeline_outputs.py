"""
Pipeline output tests
======================
These tests assert invariants on the JSON files that process.py writes.
Run after the pipeline to catch regressions before they reach the frontend.

    cd transparent-city
    source .venv/bin/activate
    pytest backend/tests/ -v

Why test pipeline outputs (not just the pipeline code)?
---------------------------------------------------------
A data pipeline can run without errors and still produce wrong data.
Testing the *shape* and *constraints* of the output is the only reliable
way to know the pipeline did what you expected.

These are sometimes called "data contract tests" or "pipeline invariant tests".
"""

import json
import os
from pathlib import Path

import pytest

import sys

# Point at the committed frontend data (what the site actually serves)
DATA_DIR = Path(os.environ.get(
    "TRANSPARENT_CITY_DATA_DIR",
    Path(__file__).parent.parent.parent / "frontend" / "public" / "data",
))
PIPELINE_DIR = Path(__file__).parent.parent / "pipeline"
sys.path.insert(0, str(PIPELINE_DIR))

from data_contract import load_contract, output_contract_violations

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


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def overview():
    path = DATA_DIR / "overview.json"
    assert path.exists(), "overview.json not found — run the pipeline first"
    with open(path) as f:
        return json.load(f)


@pytest.fixture(scope="session")
def districts():
    path = DATA_DIR / "districts.json"
    assert path.exists(), "districts.json not found — run the pipeline first"
    with open(path) as f:
        return json.load(f)


@pytest.fixture(scope="session")
def orgs():
    path = DATA_DIR / "orgs.json"
    assert path.exists(), "orgs.json not found — run the pipeline first"
    with open(path) as f:
        return json.load(f)


@pytest.fixture(scope="session")
def gallery():
    path = DATA_DIR / "gallery.json"
    assert path.exists(), "gallery.json not found — run the pipeline first"
    with open(path) as f:
        return json.load(f)


@pytest.fixture(scope="session")
def points():
    path = DATA_DIR / "points.json"
    assert path.exists(), "points.json not found — run the pipeline first"
    with open(path) as f:
        return json.load(f)


@pytest.fixture(scope="session")
def data_profile():
    path = DATA_DIR / "data_profile.json"
    assert path.exists(), "data_profile.json not found — run the pipeline first"
    with open(path) as f:
        return json.load(f)


# ─── overview.json tests ───────────────────────────────────────────────────────

class TestOverview:

    def test_historical_coverage_contract(self, overview, data_profile):
        """A structurally valid short snapshot must never be publishable."""
        violations = output_contract_violations(overview, data_profile, load_contract())
        assert not violations, "Historical coverage contract failed: " + "; ".join(violations)

    def test_has_required_keys(self, overview):
        required = [
            "total_tickets", "resolved_tickets", "resolution_rate",
            "pending_tickets", "stale_tickets", "stale_rate",
            "median_resolution_days", "avg_satisfaction",
            "data_range", "top_problem_types", "monthly_trends",
        ]
        for key in required:
            assert key in overview, f"overview.json missing key: {key}"

    def test_ticket_counts_are_consistent(self, overview):
        """resolved + pending should equal total."""
        assert overview["resolved_tickets"] + overview["pending_tickets"] == overview["total_tickets"]

    def test_resolution_rate_is_plausible(self, overview):
        """Rate should be in a realistic range for this dataset.

        Lower bound is 40%, not 50%, because of recency bias: the overall rate
        is computed across ALL tickets including the most recent months, where
        newly filed tickets haven't had time to be resolved yet. As Traffy
        releases more data, recent months (45–60% resolution) grow as a share
        of the total and pull the city-wide rate down. A rate below 40% would
        indicate a genuine pipeline or data-quality problem.
        """
        rate = overview["resolution_rate"]
        assert 40 <= rate <= 95, f"resolution_rate {rate}% outside expected 40–95%"

    def test_resolution_rate_matches_counts(self, overview):
        """The computed rate should equal resolved/total."""
        expected = round(overview["resolved_tickets"] / overview["total_tickets"] * 100, 1)
        assert overview["resolution_rate"] == expected

    def test_stale_rate_is_plausible(self, overview):
        rate = overview["stale_rate"]
        assert 0 <= rate <= 50, f"stale_rate {rate}% outside expected 0–50%"

    def test_median_resolution_days_is_positive(self, overview):
        days = overview["median_resolution_days"]
        assert days is not None
        assert days > 0, f"median_resolution_days should be positive, got {days}"
        assert days < 365, f"median_resolution_days {days} is implausibly large"

    def test_top_problem_types_has_ten(self, overview):
        assert len(overview["top_problem_types"]) == 10

    def test_top_problem_types_are_sorted_by_count(self, overview):
        counts = [t["count"] for t in overview["top_problem_types"]]
        assert counts == sorted(counts, reverse=True), "top_problem_types should be sorted descending"

    def test_monthly_trends_are_sorted(self, overview):
        months = [m["ym"] for m in overview["monthly_trends"]]
        assert months == sorted(months), "monthly_trends should be chronologically sorted"

    def test_monthly_trend_counts_are_positive(self, overview):
        for m in overview["monthly_trends"]:
            assert m["total"] > 0, f"Month {m['ym']} has 0 total tickets"

    def test_data_range_has_from_and_to(self, overview):
        dr = overview["data_range"]
        assert "from" in dr and "to" in dr
        # to should be after from
        assert dr["from"] <= dr["to"]


# ─── districts.json tests ──────────────────────────────────────────────────────

class TestDistricts:

    def test_exactly_50_districts(self, districts):
        assert len(districts) == 50, f"Expected 50 districts, got {len(districts)}"

    def test_all_districts_are_known_bangkok_districts(self, districts):
        output_names = {d["district"] for d in districts}
        unknown = output_names - BANGKOK_50
        assert not unknown, f"Unknown district names in output: {unknown}"

    def test_all_bangkok_districts_are_present(self, districts):
        output_names = {d["district"] for d in districts}
        missing = BANGKOK_50 - output_names
        assert not missing, f"Missing Bangkok districts: {missing}"

    def test_grades_are_valid(self, districts):
        valid_grades = {"A", "B", "C", "D", "F", "N/A"}
        for d in districts:
            assert d["grade"] in valid_grades, \
                f"District {d['district']} has invalid grade: {d['grade']}"

    def test_grade_distribution_roughly_matches_spec(self, districts):
        """
        Spec: A=top 20%, B=50-80%, C=20-50%, D=5-20%, F=bottom 5%.
        Allow ±2 districts tolerance for edge cases.
        """
        grade_counts = {}
        for d in districts:
            grade_counts[d["grade"]] = grade_counts.get(d["grade"], 0) + 1

        # At least some of each grade
        assert grade_counts.get("A", 0) >= 8,  f"Too few A grades: {grade_counts}"
        assert grade_counts.get("B", 0) >= 10, f"Too few B grades: {grade_counts}"
        assert grade_counts.get("C", 0) >= 10, f"Too few C grades: {grade_counts}"
        assert grade_counts.get("D", 0) >= 5,  f"Too few D grades: {grade_counts}"
        assert grade_counts.get("F", 0) >= 1,  f"No F grades: {grade_counts}"

    def test_no_negative_resolution_days(self, districts):
        bad = [
            d["district"] for d in districts
            if d.get("median_resolution_days") is not None
            and d["median_resolution_days"] < 0
        ]
        assert not bad, f"Negative median_resolution_days: {bad}"

    def test_resolution_rates_in_valid_range(self, districts):
        for d in districts:
            rate = d.get("resolution_rate")
            if rate is not None:
                assert 0 <= rate <= 100, \
                    f"District {d['district']} resolution_rate {rate}% out of range"

    def test_composite_scores_in_valid_range(self, districts):
        for d in districts:
            score = d.get("composite_score")
            if score is not None:
                assert 0 <= score <= 100, \
                    f"District {d['district']} composite_score {score} out of range"

    def test_stale_tickets_not_exceeding_total(self, districts):
        for d in districts:
            assert d["stale_tickets"] <= d["total_tickets"], \
                f"District {d['district']}: stale > total"

    def test_resolved_tickets_not_exceeding_total(self, districts):
        for d in districts:
            assert d["resolved_tickets"] <= d["total_tickets"], \
                f"District {d['district']}: resolved > total"

    def test_worst_stale_days_are_positive(self, districts):
        for d in districts:
            for ticket in d.get("worst_stale", []):
                assert ticket["days_open"] > 0, \
                    f"Stale ticket {ticket['ticket_id']} has non-positive days_open"

    def test_top_types_present(self, districts):
        for d in districts:
            assert len(d.get("top_types", [])) > 0, \
                f"District {d['district']} has no top_types"


# ─── orgs.json tests ───────────────────────────────────────────────────────────

class TestOrgs:

    def test_has_at_least_ten_orgs(self, orgs):
        assert len(orgs) >= 10, f"Only {len(orgs)} organizations — seems too few"

    def test_resolution_rates_in_valid_range(self, orgs):
        for o in orgs:
            rate = o.get("resolution_rate")
            if rate is not None:
                assert 0 <= rate <= 100, \
                    f"Org {o['organization']} resolution_rate {rate}% out of range"

    def test_sorted_by_total_tickets_descending(self, orgs):
        counts = [o["total_tickets"] for o in orgs]
        assert counts == sorted(counts, reverse=True), "orgs.json should be sorted by total_tickets descending"

    def test_no_org_with_zero_tickets(self, orgs):
        for o in orgs:
            assert o["total_tickets"] > 0


# ─── gallery.json tests ────────────────────────────────────────────────────────

class TestGallery:

    def test_has_items(self, gallery):
        assert len(gallery) > 0, "gallery.json is empty"

    def test_all_items_have_photo_pairs(self, gallery):
        """Gallery exists specifically for before/after photos — both must be present."""
        for item in gallery:
            assert item.get("photo"), f"Gallery item {item['ticket_id']} missing before photo"
            assert item.get("photo_after"), f"Gallery item {item['ticket_id']} missing after photo"

    def test_photo_urls_use_google_storage(self, gallery):
        """Traffy photos come from Google Cloud Storage — warn if pattern changes."""
        for item in gallery[:20]:  # spot check first 20
            assert "storage.googleapis.com" in item["photo"], \
                f"Unexpected photo URL format: {item['photo']}"

    def test_days_to_resolve_are_non_negative(self, gallery):
        for item in gallery:
            days = item.get("days_to_resolve")
            if days is not None:
                assert days >= 0, f"Ticket {item['ticket_id']} has negative days_to_resolve"

    def test_star_ratings_in_valid_range(self, gallery):
        for item in gallery:
            star = item.get("star")
            if star is not None:
                assert 1 <= star <= 5, f"Ticket {item['ticket_id']} has invalid star: {star}"


# ─── points.json tests ─────────────────────────────────────────────────────────

class TestPoints:

    def test_has_points(self, points):
        assert len(points) > 0, "points.json is empty"

    def test_flags_are_valid(self, points):
        valid_flags = {"stale", "low_sat"}
        for p in points[:100]:  # spot check
            assert p["flag"] in valid_flags, f"Invalid flag: {p['flag']}"

    def test_coordinates_are_in_bangkok_bounding_box(self, points):
        """
        Bangkok bounding box (approximate):
            lat: 13.49 – 13.96
            lon: 100.33 – 100.94
        Points outside this box are almost certainly coordinate parsing errors.
        """
        bad_coords = []
        for p in points:
            lat, lon = p.get("lat"), p.get("lon")
            if lat is None or lon is None:
                continue
            if not (13.49 <= lat <= 13.96 and 100.33 <= lon <= 100.94):
                bad_coords.append(p["ticket_id"])
        assert not bad_coords, f"Points outside Bangkok bbox: {bad_coords[:5]}"

    def test_no_zero_zero_coordinates(self, points):
        """0,0 coords should have been filtered out as nulls in parse_coords()."""
        zero_coords = [p["ticket_id"] for p in points if p.get("lat") == 0 and p.get("lon") == 0]
        assert not zero_coords, f"Found 0,0 coordinates that should have been filtered: {zero_coords[:5]}"

    def test_days_open_are_positive(self, points):
        for p in points:
            days = p.get("days_open")
            if days is not None:
                assert days >= 0, f"Ticket {p['ticket_id']} has negative days_open"
