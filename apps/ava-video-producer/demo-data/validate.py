#!/usr/bin/env python3
"""Validate exported fixture integrity independently of the generation formulas."""

import csv
import hashlib
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def read_rows(name):
    """Read one exported CSV without importing the generator."""
    with (ROOT / f"{name}.csv").open(newline="", encoding="utf-8") as stream:
        return list(csv.DictReader(stream))


def require(condition, message):
    """Fail with a specific data-invariant error."""
    if not condition:
        raise SystemExit(message)


def unique(rows, column):
    """Return a primary-key index, rejecting blank or duplicated identifiers."""
    result = {row[column]: row for row in rows}
    require(len(result) == len(rows) and "" not in result, f"Invalid key: {column}")
    return result


def validate_geometry(districts, point_rows):
    """Check closed rectangle WKT, coordinate bounds, and district containment."""
    bounds = {}
    for key, district in districts.items():
        points = re.findall(r"(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)", district["geometry"])
        require(len(points) == 5 and points[0] == points[-1], f"Open/invalid polygon: {key}")
        xs, ys = zip(*[(float(x), float(y)) for x, y in points])
        bounds[key] = (min(xs), min(ys), max(xs), max(ys))
    for row in point_rows:
        latitude, longitude = float(row["latitude"]), float(row["longitude"])
        require(-90 <= latitude <= 90 and -180 <= longitude <= 180, "Coordinate outside EPSG:4326")
        west, south, east, north = bounds[row["district_id"]]
        require(west < longitude < east and south < latitude < north, "Point outside assigned district")


def main():
    """Check grains, joins, dates, missingness, summaries, and file hashes."""
    manifest = json.loads((ROOT / "manifest.json").read_text())
    tables = {name: read_rows(name) for name in ["cases", "visits", "facilities", "districts", "weekly_reports"]}
    cases = unique(tables["cases"], "case_id")
    visits = unique(tables["visits"], "visit_id")
    facilities = unique(tables["facilities"], "facility_id")
    districts = unique(tables["districts"], "district_id")
    require((len(cases), len(facilities), len(districts)) == (240, 12, 6), "Unexpected fixture grain")
    for case in cases.values():
        require(case["facility_id"] in facilities, "Orphan case facility")
        require(facilities[case["facility_id"]]["district_id"] == case["district_id"], "Facility district mismatch")
        require(case["case_label"] and re.fullmatch(r"HF-\d{4}", case["case_id"]), "Unsafe case identifier/label")
        report_date, week = date.fromisoformat(case["report_date"]), date.fromisoformat(case["week_start"])
        require(0 <= (report_date - week).days <= 6 and week.weekday() == 0, "Invalid reporting week")
        require(manifest["period_start"] <= case["report_date"] <= manifest["as_of"], "Case outside reporting period")
        require(1 <= int(case["household_size"]) <= 7, "Invalid household size")
    for visit in visits.values():
        require(visit["case_id"] in cases, "Orphan visit case")
        case = cases[visit["case_id"]]
        require(visit["facility_id"] == case["facility_id"], "Visit facility mismatch")
        require(case["report_date"] <= visit["visit_date"] <= manifest["as_of"], "Visit outside reporting chronology")
        require(int(visit["supply_kits_delivered"]) >= 0 and int(visit["staff_minutes"]) > 0, "Invalid visit quantities")
    counts = Counter(case["district_id"] for case in cases.values())
    require({key: int(row["recorded_cases"]) for key, row in districts.items()} == dict(counts), "District totals do not reconcile")
    for district_id, district in districts.items():
        stock = sum(int(facility["supply_kits_available"]) for facility in facilities.values() if facility["district_id"] == district_id)
        awaiting = sum(case["referral_status"] == "awaiting_contact" for case in cases.values() if case["district_id"] == district_id)
        require(stock == int(district["supply_kits_available"]) and awaiting == int(district["awaiting_contact"]), "District stock/contact totals do not reconcile")
        require(district["as_of"] == manifest["as_of"], "District snapshot date mismatch")
    reports = tables["weekly_reports"]
    require(len({(row["district_id"], row["week_start"]) for row in reports}) == 36, "Duplicated or missing district-week")
    missing = [row for row in reports if row["reporting_status"] == "not_received"]
    require(len(missing) == 2 and all(row["reported_cases"] == row["awaiting_contact"] == "" for row in missing), "Missing reports became zero")
    require({(row["district_id"], row["week_start"]) for row in missing} == {("D06", "2026-08-31"), ("D06", "2026-09-07")}, "Missing-report periods changed")
    weekly_counts = Counter((case["district_id"], case["week_start"]) for case in cases.values())
    for row in reports:
        if row["reporting_status"] == "reported":
            require(int(row["reported_cases"]) == weekly_counts[(row["district_id"], row["week_start"])], "Weekly counts do not reconcile")
    visited = {visit["case_id"] for visit in visits.values()}
    require(all((case["case_id"] in visited) == (case["referral_status"] == "contacted") for case in cases.values()), "Visit coverage disagrees with source status")
    require(sum(case["referral_status"] == "awaiting_contact" for case in cases.values()) == 19, "Narrative count changed")
    require([int(row["reported_cases"]) for row in reports if row["district_id"] == "D02"] == [4, 5, 7, 10, 13, 17], "Eastbank trajectory changed")
    validate_geometry(districts, [*cases.values(), *facilities.values()])
    for file in manifest["files"]:
        content = (ROOT / file["path"]).read_bytes()
        require(hashlib.sha256(content).hexdigest() == file["sha256"], f"Checksum mismatch: {file['path']}")
        rows = tables[Path(file["path"]).stem]
        require(len(rows) == file["rows"] and list(rows[0]) == file["columns"], "Manifest schema/count mismatch")
        require(all(not value.startswith(("=", "+", "@")) for row in rows for value in row.values()), "Unexpected spreadsheet formula input")
    print(f"Validated: {len(cases)} cases, {len(visits)} visits, {len(facilities)} facilities, {len(districts)} districts, 36 weekly reports; 19 awaiting contact; 2 missing reports.")


if __name__ == "__main__":
    import subprocess
    subprocess.run(["node", str(Path(__file__).resolve().parent.parent / "scripts/require-license.mjs")], check=True)
    main()
