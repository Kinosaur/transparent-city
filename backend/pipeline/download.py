"""
Download monthly CSVs from Traffy Fondue open data (Bangkok).

Usage:
  python download.py                  # download current + previous month
  python download.py --months 3       # download last N months
  python download.py --all            # download all available months (2021-09 onward)
  python download.py --list           # list all available files without downloading

Registration fields:
  The primary download endpoint requires name/org/purpose/email.
  Set them via environment variables or they fall back to the defaults below.

  export TRAFFY_NAME="Your Name"
  export TRAFFY_ORG="Your Organisation"
  export TRAFFY_PURPOSE="research"
  export TRAFFY_EMAIL="you@example.com"

How Traffy download works (discovered 2026-05):
  1. Visit https://bangkok.traffy.in.th/ and click the CSV button
  2. Fill in name / org / purpose / email
  3. A listing page appears at:
       https://publicapi.traffy.in.th/teamchadchart-stat-api/download/bangkok_monthly
       ?output_type=html&output_format=csv&name=...&org=...&purpose=...&email=...
  4. Each file link in that listing has the form:
       .../download/bangkok_monthly?file_name=bangkok_YYYY-MM.csv&email=...&name=...&org=...&purpose=...
  That final URL is what we call PRIMARY_URL below.
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

import requests
from dateutil.relativedelta import relativedelta

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# ─── Registration fields ──────────────────────────────────────────────────────
# The Traffy download endpoint logs who downloaded the data.
# Provide your own details via environment variables (recommended),
# or edit the defaults here.
TRAFFY_NAME    = os.environ.get("TRAFFY_NAME",    "Transparent City")
TRAFFY_ORG     = os.environ.get("TRAFFY_ORG",     "Community Project")
TRAFFY_PURPOSE = os.environ.get("TRAFFY_PURPOSE", "civic transparency research")
TRAFFY_EMAIL   = os.environ.get("TRAFFY_EMAIL",   "kaungkhantlin999@gmail.com")

# ─── Download endpoints ───────────────────────────────────────────────────────
# PRIMARY: discovered May 2026 — requires registration fields, works for all months
#   including recent ones that the old endpoints return 404 for.
PRIMARY_URL = (
    "https://publicapi.traffy.in.th/teamchadchart-stat-api/download/bangkok_monthly"
    "?file_name=bangkok_{ym}"
    "&name={name}&org={org}&purpose={purpose}&email={email}"
)

# LEGACY: the old direct-link endpoints (kept as fallback; may 404 for recent months)
LEGACY_URL_1 = "https://publicapi.traffy.in.th/dump-csv-chadchart/bangkok_{ym}.csv"
LEGACY_URL_2 = "https://opendata.traffy.in.th/download/bangkok_{ym}.csv"

# Listing endpoint — returns an HTML page with all available files and their sizes
LISTING_URL = (
    "https://publicapi.traffy.in.th/teamchadchart-stat-api/download/bangkok_monthly"
    "?output_type=html&output_format=csv"
    "&name={name}&org={org}&purpose={purpose}&email={email}"
)


def month_range(start_ym: str, end_ym: str):
    """Yield 'YYYY-MM' strings from start_ym to end_ym inclusive."""
    year, month = map(int, start_ym.split("-"))
    ey, em = map(int, end_ym.split("-"))
    while (year, month) <= (ey, em):
        yield f"{year:04d}-{month:02d}"
        month += 1
        if month > 12:
            month = 1
            year += 1


def download_month(ym: str, force: bool = False) -> bool:
    dest = DATA_DIR / f"bangkok_{ym}.csv"
    if dest.exists() and not force:
        print(f"  ✓ {ym} already exists, skipping")
        return True

    urls = [
        PRIMARY_URL.format(
            ym=ym,
            name=requests.utils.quote(TRAFFY_NAME),
            org=requests.utils.quote(TRAFFY_ORG),
            purpose=requests.utils.quote(TRAFFY_PURPOSE),
            email=requests.utils.quote(TRAFFY_EMAIL),
        ),
        LEGACY_URL_1.format(ym=ym),
        LEGACY_URL_2.format(ym=ym),
    ]

    for url in urls:
        try:
            r = requests.get(url, timeout=120)
            if r.status_code != 200:
                print(f"  ✗ {ym}  HTTP {r.status_code} from {url.split('?')[0]}")
                continue

            # The Traffy API returns "File not found" (text/html, 14 bytes) with
            # a 200 status when a month hasn't been uploaded yet.
            content_type = r.headers.get("content-type", "")
            if "html" in content_type:
                body_preview = r.content[:30].decode("utf-8", errors="ignore").strip()
                print(f"  ✗ {ym}  Not available yet ({body_preview!r})")
                continue

            dest.write_bytes(r.content)
            size_kb = dest.stat().st_size / 1024
            if size_kb < 1:
                dest.unlink()
                print(f"  ✗ {ym}  Empty response")
                continue

            print(f"  ↓ {ym}  {size_kb:,.0f} KB")
            return True

        except Exception as e:
            print(f"  ✗ {ym}  Error: {e}")

    return False


def list_available() -> None:
    """Fetch the listing page and print all available files with sizes."""
    url = LISTING_URL.format(
        name=requests.utils.quote(TRAFFY_NAME),
        org=requests.utils.quote(TRAFFY_ORG),
        purpose=requests.utils.quote(TRAFFY_PURPOSE),
        email=requests.utils.quote(TRAFFY_EMAIL),
    )
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        # Simple parse: look for file_name= in href attributes
        import re
        pattern = r'file_name=(bangkok_[\d-]+\.csv)[^"]*"[^>]*>.*?(\d+(?:,\d+)*)\s*(?:bytes?|KB|MB)?'
        matches = re.findall(pattern, r.text, re.IGNORECASE)
        if matches:
            print(f"{'File':<25} {'Remote size':>15}")
            print("-" * 42)
            for fname, size in matches:
                ym = fname.replace("bangkok_", "").replace(".csv", "")
                local = DATA_DIR / fname
                local_status = "✓ local" if local.exists() else "  missing"
                print(f"  {ym:<22} {size:>15}  {local_status}")
        else:
            print("Could not parse listing — visit the URL manually:")
            print(f"  {url}")
    except Exception as e:
        print(f"Could not fetch listing: {e}")


MANIFEST_PATH = DATA_DIR / "manifest.json"


def load_manifest() -> dict:
    """
    The manifest tracks which months have been successfully downloaded.

    Why a manifest?
    - Idempotency: running the downloader twice won't re-download files that
      are already complete and verified.
    - Visibility: you can inspect manifest.json to see exactly what's been
      downloaded and when — useful for debugging CI failures.
    - This is a common pattern in production data pipelines (e.g. Airflow's
      task state DB, dbt's run_results.json).
    """
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH) as f:
            return json.load(f)
    return {"downloaded": {}}


def save_manifest(manifest: dict) -> None:
    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Download Traffy Fondue Bangkok CSVs")
    parser.add_argument("--months", type=int, default=2,
                        help="Download last N months (default: 2)")
    parser.add_argument("--all", action="store_true",
                        help="Download all available months (2021-09 onward)")
    parser.add_argument("--force", action="store_true",
                        help="Re-download even if the file already exists")
    parser.add_argument("--list", action="store_true",
                        help="List all available files without downloading")
    args = parser.parse_args()

    if args.list:
        list_available()
        return

    now = datetime.now()

    if args.all:
        months = list(month_range("2021-09", f"{now.year:04d}-{now.month:02d}"))
    else:
        months = sorted(
            {
                (now - relativedelta(months=i)).strftime("%Y-%m")
                for i in range(args.months)
            },
            reverse=True,
        )

    manifest = load_manifest()

    print(f"Downloading {len(months)} month(s) into {DATA_DIR}/")
    print(f"  Registration: {TRAFFY_NAME} / {TRAFFY_ORG} / {TRAFFY_EMAIL}")
    print()

    ok = 0
    for m in months:
        if download_month(m, force=args.force):
            ok += 1
            manifest["downloaded"][m] = {
                "downloaded_at": datetime.now().isoformat(),
                "size_bytes": (DATA_DIR / f"bangkok_{m}.csv").stat().st_size,
            }

    save_manifest(manifest)

    print()
    print(f"Done: {ok}/{len(months)} files ready.")
    print(f"Manifest updated: {MANIFEST_PATH}")
    if ok == 0:
        print("⚠  No files downloaded.")
        print("   Set TRAFFY_EMAIL / TRAFFY_NAME / TRAFFY_ORG env vars and retry,")
        print("   or download manually from https://bangkok.traffy.in.th/")
    elif ok < len(months):
        print(f"⚠  {len(months) - ok} file(s) could not be downloaded.")


if __name__ == "__main__":
    main()
