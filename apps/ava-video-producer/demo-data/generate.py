#!/usr/bin/env python3
"""Build the fictional Harborfield import fixtures without network or dependencies."""

import argparse
import csv
import hashlib
import io
import json
from collections import Counter
from datetime import date, timedelta
from pathlib import Path
from random import Random

SEED = 20261014
START = date(2026, 8, 3)
AS_OF = date(2026, 9, 13)
ROOT = Path(__file__).resolve().parent
DISTRICTS = [
    ("D01", "North Quay", [8, 9, 10, 9, 8, 7], 18400),
    ("D02", "Eastbank", [4, 5, 7, 10, 13, 17], 22100),
    ("D03", "South Gardens", [6, 7, 6, 8, 7, 6], 16500),
    ("D04", "Ridge", [3, 4, 5, 5, 6, 6], 12400),
    ("D05", "Lakeside", [5, 6, 6, 7, 7, 8], 15300),
    ("D06", "West Marsh", [6, 7, 6, 6, None, None], 13200),
]


def geometry(index):
    """Return an invented rectangular district in EPSG:4326 longitude/latitude."""
    west = round(10 + (index % 3) * 0.08, 4)
    south = round(10 + (index // 3) * 0.08, 4)
    east, north = round(west + 0.08, 4), round(south + 0.08, 4)
    polygon = f"POLYGON (({west} {south}, {east} {south}, {east} {north}, {west} {north}, {west} {south}))"
    return west, south, east, north, polygon


def build_facilities():
    """Give every district two fictional facilities with stable IDs and stock."""
    facilities = []
    for index, (district_id, name, _, _) in enumerate(DISTRICTS):
        west, south, _, _, _ = geometry(index)
        for offset in range(2):
            facilities.append({
                "facility_id": f"F{index * 2 + offset + 1:02}",
                "facility_name": f"{name} {'Hub' if offset == 0 else 'Outreach'}",
                "district_id": district_id,
                "facility_type": "response_hub" if offset == 0 else "outreach_post",
                "latitude": round(south + 0.025 + offset * 0.03, 5),
                "longitude": round(west + 0.025 + offset * 0.03, 5),
                "staff_count": 4 + (index + offset) % 5,
                "supply_kits_available": (7 + offset * 3) if district_id == "D02" else 40 + index * 9 + offset * 12,
                "stock_as_of": AS_OF.isoformat(),
            })
    return facilities


def build_cases():
    """Create anonymous administrative records, with no medical inference."""
    rng = Random(SEED)
    cases = []
    for index, (district_id, name, weeks, _) in enumerate(DISTRICTS):
        west, south, _, _, _ = geometry(index)
        for week_index, weekly_case_count in enumerate(weeks):
            for local_index in range(weekly_case_count or 0):
                sequence = len(cases) + 1
                report_date = START + timedelta(days=week_index * 7 + local_index % 7)
                cases.append({
                    "case_id": f"HF-{sequence:04}",
                    "case_label": f"Response case {sequence:03}",
                    "district_id": district_id,
                    "district_name": name,
                    "facility_id": f"F{index * 2 + local_index % 2 + 1:02}",
                    "report_date": report_date.isoformat(),
                    "week_start": (START + timedelta(days=week_index * 7)).isoformat(),
                    "age_band": rng.choice(["0-4", "5-17", "18-44", "45-64", "65+"]),
                    "support_need": rng.choice(["water", "supplies", "transport", "information"]),
                    "referral_status": "awaiting_contact" if district_id == "D02" and week_index >= 4 and local_index % 3 else "contacted",
                    "latitude": round(south + 0.008 + rng.random() * 0.064, 5),
                    "longitude": round(west + 0.008 + rng.random() * 0.064, 5),
                    "household_size": rng.randint(1, 7),
                })
    return cases


def build_visits(cases):
    """Create dated follow-ups and quantities, preserving the case foreign key."""
    visits = []
    for index, case in enumerate(cases):
        if case["referral_status"] == "awaiting_contact":
            continue
        report_date = date.fromisoformat(case["report_date"])
        for visit_index in range(1 + (index % 3 == 0)):
            visit_date = min(report_date + timedelta(days=visit_index * 3 + 1), AS_OF)
            visits.append({
                "visit_id": f"V{len(visits) + 1:04}",
                "case_id": case["case_id"],
                "facility_id": case["facility_id"],
                "visit_date": visit_date.isoformat(),
                "contact_method": "in_person" if visit_index == 0 else "phone",
                "supply_kits_delivered": 1 + index % 3 if visit_index == 0 else 0,
                "staff_minutes": 15 + (index * 7 + visit_index * 5) % 41,
            })
    return visits


def build_districts(cases, facilities):
    """Store all-period recorded totals beside invented polygon geometry."""
    counts = Counter(case["district_id"] for case in cases)
    awaiting = Counter(case["district_id"] for case in cases if case["referral_status"] == "awaiting_contact")
    return [{
        "district_id": district_id, "district_name": name, "population": population,
        "recorded_cases": counts[district_id], "awaiting_contact": awaiting[district_id],
        "supply_kits_available": sum(f["supply_kits_available"] for f in facilities if f["district_id"] == district_id),
        "latest_reporting_status": "not_received" if weeks[-1] is None else "reported",
        "as_of": AS_OF.isoformat(), "geometry": geometry(index)[4],
    } for index, (district_id, name, weeks, population) in enumerate(DISTRICTS)]


def build_reports(cases):
    """Separate missing reports from actual counts, including real zero values."""
    reports = []
    for district_id, name, weeks, _ in DISTRICTS:
        for week_index, weekly_case_count in enumerate(weeks):
            week = (START + timedelta(days=week_index * 7)).isoformat()
            matching = [case for case in cases if case["district_id"] == district_id and case["week_start"] == week]
            reports.append({
                "district_id": district_id, "district_name": name, "week_start": week,
                "reported_cases": weekly_case_count,
                "awaiting_contact": sum(case["referral_status"] == "awaiting_contact" for case in matching) if weekly_case_count is not None else None,
                "reporting_status": "not_received" if weekly_case_count is None else "reported",
            })
    return reports


def build_tables():
    """Return the bundle tables in their recommended import order."""
    facilities = build_facilities()
    cases = build_cases()
    return {
        "facilities": facilities,
        "cases": cases,
        "visits": build_visits(cases),
        "districts": build_districts(cases, facilities),
        "weekly_reports": build_reports(cases),
    }


def encode_csv(rows):
    """Produce UTF-8 RFC-style CSV with explicit headers and LF line endings."""
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue().encode("utf-8")


def expected_files():
    """Return deterministic CSV bytes plus a self-describing checksum manifest."""
    tables = build_tables()
    files = {f"{name}.csv": encode_csv(rows) for name, rows in tables.items()}
    manifest = {
        "bundle": "harborfield-response", "version": 1, "seed": SEED,
        "synthetic": True, "as_of": AS_OF.isoformat(),
        "period_start": START.isoformat(), "coordinate_system": "EPSG:4326",
        "provenance": "Entirely invented by this generator. No real individuals, facilities, districts, boundaries, or event observations.",
        "files": [{"path": path, "rows": len(tables[Path(path).stem]),
                   "columns": list(tables[Path(path).stem][0]),
                   "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}
                  for path, content in files.items()],
        "expected": {"cases": 240, "districts": 6, "facilities": 12,
                     "visits": len(tables["visits"]), "missing_weekly_reports": 2,
                     "awaiting_contact": sum(c["referral_status"] == "awaiting_contact" for c in tables["cases"])},
    }
    files["manifest.json"] = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode()
    return files


def main():
    """Write fixtures, check exact regeneration, or emit the typed authoring model."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare checked-in files without writing")
    parser.add_argument("--model", action="store_true", help="Emit typed rows as JSON without writing")
    args = parser.parse_args()
    if args.model:
        print(json.dumps(build_tables()))
        return
    mismatches = []
    for name, content in expected_files().items():
        path = ROOT / name
        if args.check:
            if not path.exists() or path.read_bytes() != content:
                mismatches.append(name)
        else:
            path.write_bytes(content)
    if mismatches:
        raise SystemExit("Regeneration mismatch: " + ", ".join(mismatches))
    print("Fixture regeneration matches." if args.check else "Generated five CSVs and manifest.json.")


if __name__ == "__main__":
    import subprocess
    subprocess.run(["node", str(Path(__file__).resolve().parent.parent / "scripts/require-license.mjs")], check=True)
    main()
