"""
Download latest monthly CSVs from Traffy Fondue open data.

Usage:
  python download.py                  # download current + previous month
  python download.py --months 3       # download last N months
  python download.py --all            # download all available months (2021-09 onward)
"""

import argparse
import os
from datetime import datetime, timedelta
from pathlib import Path

import requests

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Traffy Fondue open data CSV URL pattern
# Verify the exact URL from: https://www.traffy.in.th/download
BASE_URL = "https://publicapi.traffy.in.th/dump-csv-chadchart/bangkok_{ym}.csv"

# Fallback / alternative URL pattern (try if primary fails)
ALT_URL = "https://opendata.traffy.in.th/download/bangkok_{ym}.csv"


def month_range(start_ym: str, end_ym: str):
    """Yield 'YYYY-MM' strings from start to end inclusive."""
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

    for url_tpl in [BASE_URL, ALT_URL]:
        url = url_tpl.format(ym=ym)
        try:
            r = requests.get(url, timeout=60, stream=True)
            if r.status_code == 200:
                with open(dest, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
                size_kb = dest.stat().st_size / 1024
                print(f"  ↓ {ym}  {size_kb:,.0f} KB  ({url})")
                return True
            else:
                print(f"  ✗ {ym}  HTTP {r.status_code} from {url}")
        except Exception as e:
            print(f"  ✗ {ym}  Error: {e}")

    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--months", type=int, default=2, help="Download last N months")
    parser.add_argument("--all", action="store_true", help="Download all available months")
    parser.add_argument("--force", action="store_true", help="Re-download even if file exists")
    args = parser.parse_args()

    now = datetime.now()

    if args.all:
        start = "2021-09"
        end = f"{now.year:04d}-{now.month:02d}"
        months = list(month_range(start, end))
    else:
        months = []
        for i in range(args.months - 1, -1, -1):
            dt = (now.replace(day=1) - timedelta(days=1) * 32 * i)
            months.append(f"{dt.year:04d}-{dt.month:02d}")
        months = sorted(set(months))

    print(f"Downloading {len(months)} month(s) into {DATA_DIR}/")
    ok = sum(download_month(m, force=args.force) for m in months)
    print(f"\nDone: {ok}/{len(months)} files ready.")


if __name__ == "__main__":
    main()
