"""
One-time script: download Bangkok's 50 district boundaries from Overpass API (OSM)
and save as frontend/public/data/bangkok-districts.geojson

Run once — boundaries don't change. Re-run only if the file is deleted.
"""

import json
import sys
from pathlib import Path

import requests
import osm2geojson

OUT_PATH = Path(__file__).parent.parent.parent / "frontend" / "public" / "data" / "bangkok-districts.geojson"

# Thai names as they appear in our districts.json — used to match OSM features
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

OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter"
# Bangkok (relation 92277) → all sub-relations (the 50 districts, admin_level=6)
# District names in OSM have "เขต" prefix: "เขตจตุจักร" → "จตุจักร"
QUERY = """
[out:json][timeout:180];
rel(92277);
rel(r);
out body;
>;
out skel qt;
"""


def main():
    if OUT_PATH.exists():
        print(f"✓ {OUT_PATH.name} already exists — delete it to re-download.")
        return

    print("▶ Querying Overpass API for Bangkok district boundaries...")
    try:
        resp = requests.post(OVERPASS_URL, data={"data": QUERY}, timeout=240)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"✗ Overpass API request failed: {e}", file=sys.stderr)
        sys.exit(1)

    print("▶ Converting OSM → GeoJSON...")
    raw = resp.json()
    geojson = osm2geojson.json2geojson(raw)

    # Keep only relation features (districts), strip "เขต" prefix to match districts.json
    features = []
    matched = set()
    for feat in geojson.get("features", []):
        props = feat.get("properties", {}) or {}
        if props.get("type") != "relation":
            continue
        tags = props.get("tags", {})
        osm_name = tags.get("name", "")
        # Strip "เขต" prefix
        name = osm_name.removeprefix("เขต")

        if name in BANGKOK_50:
            features.append({
                "type": "Feature",
                "properties": {"district": name},
                "geometry": feat["geometry"],
            })
            matched.add(name)

    missing = BANGKOK_50 - matched
    if missing:
        print(f"  ⚠ Could not match {len(missing)} districts: {missing}", file=sys.stderr)

    output = {"type": "FeatureCollection", "features": features}
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"✓ Saved {OUT_PATH.name} — {len(features)}/50 districts matched, {size_kb:.0f} KB")


if __name__ == "__main__":
    main()
