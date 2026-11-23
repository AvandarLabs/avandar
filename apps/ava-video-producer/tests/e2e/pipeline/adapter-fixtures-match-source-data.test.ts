import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { prop, propEq } from "@avandar/utils";

const root = fileURLToPath(new URL("../../../", import.meta.url));

const _readJson = async (relative: string) => {
  return JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
};

const _sha256 = (bytes: Buffer) => {
  return createHash("sha256").update(bytes).digest("hex");
};

type Row = Record<string, string>;

type Dataset =
  | "cases"
  | "visits"
  | "facilities"
  | "districts"
  | "weekly_reports";

type Fixtures = Record<Dataset, Row[]> & {
  districtCounts: Array<{ district_name: string; recorded_cases: number }>;
};

// Independent CSV reader for source-parity checks, including quoted WKT commas.
function _readCsv(text: string): Row[] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  assert.equal(quoted, false, "CSV must close quoted fields");
  if (field || row.length) {
    row.push(field);
    records.push(row);
  }
  const columns = records.shift()!;
  return records.map((values) => {
    assert.equal(values.length, columns.length);
    return Object.fromEntries(
      columns.map((column, index) => {
        return [column, values[index]];
      }),
    );
  });
}

function _assertDatasetGrainAndVisitReferences(
  fixtures: Readonly<Fixtures>,
): void {
  assert.deepEqual(
    [
      fixtures.cases.length,
      fixtures.visits.length,
      fixtures.facilities.length,
      fixtures.districts.length,
      fixtures.weekly_reports.length,
    ],
    [240, 297, 12, 6, 36],
  );
  const caseIds = new Set(fixtures.cases.map(prop("case_id")));
  const facilityIds = new Set(fixtures.facilities.map(prop("facility_id")));
  assert.equal(caseIds.size, 240);
  assert.equal(new Set(fixtures.visits.map(prop("visit_id"))).size, 297);
  assert.equal(facilityIds.size, 12);
  fixtures.visits.forEach((row) => {
    assert.ok(caseIds.has(row.case_id), row.visit_id);
    assert.ok(facilityIds.has(row.facility_id), row.visit_id);
  });
}

function _assertDistrictAggregation(fixtures: Readonly<Fixtures>): void {
  const counts = new Map<string, number>();
  Array.from(fixtures.cases).forEach((row) => {
    counts.set(row.district_name, (counts.get(row.district_name) ?? 0) + 1);
  });
  const grouped = [...counts]
    .sort(([a], [b]) => {
      return a.localeCompare(b);
    })
    .map(([district_name, recorded_cases]) => {
      return {
        district_name,
        recorded_cases,
      };
    });
  assert.deepEqual(fixtures.districtCounts, grouped);
  assert.deepEqual(Object.fromEntries(counts), {
    "North Quay": 51,
    Eastbank: 56,
    "South Gardens": 40,
    Lakeside: 39,
    Ridge: 29,
    "West Marsh": 25,
  });
}

function _assertAwaitingContactCoverage(fixtures: Readonly<Fixtures>): void {
  const visitedIds = new Set(fixtures.visits.map(prop("case_id")));
  assert.equal(visitedIds.size, 221);
  const awaiting = fixtures.cases.filter(
    propEq("referral_status", "awaiting_contact"),
  );
  assert.equal(awaiting.length, 19);
  assert.ok(
    awaiting.every((row) => {
      return row.district_name === "Eastbank" && !visitedIds.has(row.case_id);
    }),
  );
}

function _assertSelectedCaseDelivery(fixtures: Readonly<Fixtures>): void {
  const selected = fixtures.cases.find(propEq("case_id", "HF-0001"))!;
  assert.deepEqual(
    [selected.case_label, selected.district_name, selected.referral_status],
    ["Response case 001", "North Quay", "contacted"],
  );
  assert.equal(
    fixtures.visits
      .filter(propEq("case_id", selected.case_id))
      .reduce((sum, row) => {
        return sum + Number(row.supply_kits_delivered);
      }, 0),
    1,
  );
}

function _assertMissingWeeklyReports(fixtures: Readonly<Fixtures>): void {
  const missing = fixtures.weekly_reports.filter(
    propEq("reporting_status", "not_received"),
  );
  assert.equal(missing.length, 2);
  assert.ok(
    missing.every((row) => {
      return row.reported_cases === "" && row.awaiting_contact === "";
    }),
  );
}

test("adapter fixtures preserve every source CSV row, column, string and missing value", async () => {
  const fixtures: Fixtures = await _readJson("avandar-adapter/fixtures.json");
  const manifest = await _readJson("demo-data/manifest.json");
  assert.equal(manifest.synthetic, true);
  for (const file of manifest.files) {
    assert.match(
      file.path,
      /^(cases|visits|facilities|districts|weekly_reports)\.csv$/,
    );
    const bytes = await fs.readFile(path.join(root, "demo-data", file.path));
    assert.equal(_sha256(bytes), file.sha256, file.path);
    assert.equal(bytes.length, file.bytes, file.path);
    const sourceRows = _readCsv(bytes.toString("utf8"));
    assert.equal(sourceRows.length, file.rows, file.path);
    assert.deepEqual(Object.keys(sourceRows[0]), file.columns, file.path);
    assert.deepEqual(
      fixtures[file.path.replace(".csv", "") as Dataset],
      sourceRows,
      file.path,
    );
  }
});

test("film aggregations and joined case detail keep the source dataset grain", async () => {
  const fixtures: Fixtures = await _readJson("avandar-adapter/fixtures.json");
  _assertDatasetGrainAndVisitReferences(fixtures);
  _assertDistrictAggregation(fixtures);
  _assertAwaitingContactCoverage(fixtures);
  _assertSelectedCaseDelivery(fixtures);
  _assertMissingWeeklyReports(fixtures);
});

test("native map inputs contain 252 valid geographic points and the inspected facility", async () => {
  const fixtures: Fixtures = await _readJson("avandar-adapter/fixtures.json");
  const points = [...fixtures.cases, ...fixtures.facilities];
  assert.equal(points.length, 252);
  points.forEach((row) => {
    assert.notEqual(row.latitude, "");
    assert.notEqual(row.longitude, "");
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    assert.ok(Number.isFinite(latitude) && Math.abs(latitude) <= 90);
    assert.ok(Number.isFinite(longitude) && Math.abs(longitude) <= 180);
  });
  const selected = fixtures.facilities.find(propEq("facility_id", "F03"))!;
  assert.deepEqual(
    [
      selected.facility_name,
      selected.staff_count,
      selected.supply_kits_available,
      selected.stock_as_of,
    ],
    ["Eastbank Hub", "5", "7", "2026-09-13"],
  );
});
