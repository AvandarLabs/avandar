import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = async (relative: string) =>
  JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
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
function readCsv(text: string): Row[] {
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
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else field += character;
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
      columns.map((column, index) => [column, values[index]]),
    );
  });
}

test("adapter fixtures preserve every source CSV row, column, string and missing value", async () => {
  const fixtures: Fixtures = await readJson("avandar-adapter/fixtures.json");
  const manifest = await readJson("demo-data/manifest.json");
  assert.equal(manifest.synthetic, true);
  for (const file of manifest.files) {
    assert.match(
      file.path,
      /^(cases|visits|facilities|districts|weekly_reports)\.csv$/,
    );
    const bytes = await fs.readFile(path.join(root, "demo-data", file.path));
    assert.equal(sha256(bytes), file.sha256, file.path);
    assert.equal(bytes.length, file.bytes, file.path);
    const sourceRows = readCsv(bytes.toString("utf8"));
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
  const fixtures: Fixtures = await readJson("avandar-adapter/fixtures.json");
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
  const caseIds = new Set(fixtures.cases.map((row) => row.case_id));
  const facilityIds = new Set(
    fixtures.facilities.map((row) => row.facility_id),
  );
  assert.equal(caseIds.size, 240);
  assert.equal(new Set(fixtures.visits.map((row) => row.visit_id)).size, 297);
  assert.equal(facilityIds.size, 12);
  for (const row of fixtures.visits) {
    assert.ok(caseIds.has(row.case_id), row.visit_id);
    assert.ok(facilityIds.has(row.facility_id), row.visit_id);
  }
  const counts = new Map<string, number>();
  for (const row of fixtures.cases)
    counts.set(row.district_name, (counts.get(row.district_name) ?? 0) + 1);
  const grouped = [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([district_name, recorded_cases]) => ({
      district_name,
      recorded_cases,
    }));
  assert.deepEqual(fixtures.districtCounts, grouped);
  assert.deepEqual(Object.fromEntries(counts), {
    "North Quay": 51,
    Eastbank: 56,
    "South Gardens": 40,
    Lakeside: 39,
    Ridge: 29,
    "West Marsh": 25,
  });
  const visitedIds = new Set(fixtures.visits.map((row) => row.case_id));
  assert.equal(visitedIds.size, 221);
  const awaiting = fixtures.cases.filter(
    (row) => row.referral_status === "awaiting_contact",
  );
  assert.equal(awaiting.length, 19);
  assert.ok(
    awaiting.every(
      (row) => row.district_name === "Eastbank" && !visitedIds.has(row.case_id),
    ),
  );
  const selected = fixtures.cases.find((row) => row.case_id === "HF-0001")!;
  assert.deepEqual(
    [selected.case_label, selected.district_name, selected.referral_status],
    ["Response case 001", "North Quay", "contacted"],
  );
  assert.equal(
    fixtures.visits
      .filter((row) => row.case_id === selected.case_id)
      .reduce((sum, row) => sum + Number(row.supply_kits_delivered), 0),
    1,
  );
  const missing = fixtures.weekly_reports.filter(
    (row) => row.reporting_status === "not_received",
  );
  assert.equal(missing.length, 2);
  assert.ok(
    missing.every(
      (row) => row.reported_cases === "" && row.awaiting_contact === "",
    ),
  );
});

test("native map inputs contain 252 valid geographic points and the inspected facility", async () => {
  const fixtures: Fixtures = await readJson("avandar-adapter/fixtures.json");
  const points = [...fixtures.cases, ...fixtures.facilities];
  assert.equal(points.length, 252);
  for (const row of points) {
    assert.notEqual(row.latitude, "");
    assert.notEqual(row.longitude, "");
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    assert.ok(Number.isFinite(latitude) && Math.abs(latitude) <= 90);
    assert.ok(Number.isFinite(longitude) && Math.abs(longitude) <= 180);
  }
  const selected = fixtures.facilities.find(
    (row) => row.facility_id === "F03",
  )!;
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
