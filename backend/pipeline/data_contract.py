"""Historical-coverage checks that protect published Transparent City data.

The project may ingest newly available months, but a scheduled refresh must
never silently replace the retained historical corpus with a smaller snapshot.
The baseline lives in ``data_contract.json`` so a deliberate change is visible
and reviewable in git.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any


CONTRACT_PATH = Path(__file__).with_name("data_contract.json")


def load_contract() -> dict[str, Any]:
    with CONTRACT_PATH.open(encoding="utf-8") as contract_file:
        return json.load(contract_file)


def _months_behind(latest_month: str, now: datetime | None = None) -> int:
    now = now or datetime.now()
    latest = datetime.strptime(latest_month, "%Y-%m")
    return (now.year - latest.year) * 12 + (now.month - latest.month)


def input_contract_violations(
    months_present: set[str], contract: dict[str, Any] | None = None, now: datetime | None = None
) -> list[str]:
    """Return every historical-coverage violation for raw monthly CSVs."""
    contract = contract or load_contract()
    if not months_present:
        return ["No raw monthly CSV files are available."]

    violations: list[str] = []
    required = set(contract["required_raw_months"])
    missing_required = sorted(required - months_present)
    if missing_required:
        violations.append(
            "Missing required historical month(s): " + ", ".join(missing_required)
        )

    if len(months_present) < contract["minimum_raw_csv_files"]:
        violations.append(
            f"Only {len(months_present)} raw CSVs; contract requires at least "
            f"{contract['minimum_raw_csv_files']}."
        )

    earliest = min(months_present)
    if earliest > contract["earliest_raw_month"]:
        violations.append(
            f"Earliest raw month is {earliest}; contract requires "
            f"{contract['earliest_raw_month']} or earlier."
        )

    latest = max(months_present)
    lag = _months_behind(latest, now)
    if lag > contract["maximum_raw_data_lag_months"]:
        violations.append(
            f"Latest raw month is {latest}, {lag} months behind; contract permits at most "
            f"{contract['maximum_raw_data_lag_months']}."
        )

    return violations


def output_contract_violations(
    overview: dict[str, Any], profile: dict[str, Any] | None = None,
    contract: dict[str, Any] | None = None,
) -> list[str]:
    """Return every historical-coverage violation for published Gold JSON."""
    contract = contract or load_contract()
    violations: list[str] = []

    total = overview.get("total_tickets", 0)
    if total < contract["minimum_total_tickets"]:
        violations.append(
            f"Only {total:,} published tickets; contract requires at least "
            f"{contract['minimum_total_tickets']:,}."
        )

    trend_count = len(overview.get("monthly_trends", []))
    if trend_count < contract["minimum_monthly_trend_points"]:
        violations.append(
            f"Only {trend_count} monthly trend points; contract requires at least "
            f"{contract['minimum_monthly_trend_points']}."
        )

    date_from = overview.get("data_range", {}).get("from", "")
    if not date_from or date_from[:7] > contract["earliest_output_month"]:
        violations.append(
            f"Published data starts at {date_from or 'unknown'}; contract requires "
            f"{contract['earliest_output_month']} or earlier."
        )

    if profile:
        raw_file_count = profile.get("input", {}).get("csv_files", 0)
        if raw_file_count < contract["minimum_raw_csv_files"]:
            violations.append(
                f"data_profile records only {raw_file_count} raw CSVs; contract requires at least "
                f"{contract['minimum_raw_csv_files']}."
            )

    return violations
