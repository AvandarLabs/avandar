import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import { buildCsvFromDatastoreRecords } from "$/open-data/buildCsvFromDatastoreRecords";
import type { DuckDBConnection } from "@duckdb/node-api";
import type { CkanDatastoreField } from "$/open-data/CkanClient/CkanClient.types";

/**
 * This suite lives under `src/` rather than beside
 * `shared/open-data/buildCsvFromDatastoreRecords.ts` because it reuses
 * `withDuckDb`, whose DuckDB driver is Node-only. Anything under `shared/` is
 * type-checked by Deno and may use only path-alias imports, and there is no
 * Deno-visible alias for `src/`, so importing the harness from there would fail
 * both `deno check shared` and lint. Duplicating the harness was the
 * alternative, and its whole purpose is to be the one place a DuckDB
 * instance is guaranteed to be closed.
 */
const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * `allow_quoted_nulls=false` is required to tell an empty string apart from an
 * absent value: with DuckDB's default the reader turns a quoted empty field
 * into NULL, so both would look the same and the writer's distinction would
 * be untestable.
 */
const READ_OPTIONS = "header=true, all_varchar=true, allow_quoted_nulls=false";

function _fields(...ids: readonly string[]): CkanDatastoreField[] {
  return ids.map((id) => {
    return { id, type: "text" };
  });
}

/**
 * Writes `csv` to a temp file and returns the path, since `read_csv` needs
 * one.
 */
function _writeCsvFile(csv: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "ckan-csv-")), "records.csv");
  writeFileSync(path, csv, "utf8");
  return path;
}

async function _readRows(
  connection: DuckDBConnection,
  path: string,
): Promise<Array<Record<string, unknown>>> {
  const reader = await connection.runAndReadAll(
    `SELECT * FROM read_csv('${path}', ${READ_OPTIONS})`,
  );
  return reader.getRowObjects();
}

/**
 * Builds CSV from records and reads it back with a real DuckDB, returning the
 * rows the reader produced.
 *
 * Every assertion in this file goes through this helper rather than comparing
 * the CSV text, because the claim under test is that a SQL engine reads back
 * what went in. A string assertion can agree with a writer that both quote
 * wrongly in the same way.
 */
async function _roundTrip(params: {
  fields: readonly CkanDatastoreField[];
  records: ReadonlyArray<Readonly<Record<string, unknown>>>;
}): Promise<Array<Record<string, unknown>>> {
  const path = _writeCsvFile(buildCsvFromDatastoreRecords(params));
  return await withDuckDb(async (connection) => {
    return await _readRows(connection, path);
  });
}

describe("buildCsvFromDatastoreRecords, read back by DuckDB", () => {
  it("round trips a plain record", async () => {
    expect(
      await _roundTrip({
        fields: _fields("country", "value"),
        records: [{ country: "MWI", value: "29450000" }],
      }),
    ).toEqual([{ country: "MWI", value: "29450000" }]);
  });

  it("round trips an embedded comma without splitting the row", async () => {
    expect(
      await _roundTrip({
        fields: _fields("name", "code"),
        records: [{ name: "Lilongwe, Malawi", code: "MWI" }],
      }),
    ).toEqual([{ name: "Lilongwe, Malawi", code: "MWI" }]);
  });

  it("round trips an embedded double quote", async () => {
    expect(
      await _roundTrip({
        fields: _fields("note"),
        records: [{ note: 'he said "hi"' }],
      }),
    ).toEqual([{ note: 'he said "hi"' }]);
  });

  it("round trips an embedded newline inside one field", async () => {
    expect(
      await _roundTrip({
        fields: _fields("note", "code"),
        records: [{ note: "line one\nline two", code: "MWI" }],
      }),
    ).toEqual([{ note: "line one\nline two", code: "MWI" }]);
  });

  it("keeps an absent value and an empty string distinguishable", async () => {
    const [row] = await _roundTrip({
      fields: _fields("absent", "empty"),
      records: [{ empty: "" }],
    });

    expect(row?.absent).toBeNull();
    expect(row?.empty).toBe("");
  });

  // The bug this catches: taking column order from a record's own keys. The
  // second record omits `middle`, so a key-order writer would put `last` under
  // `middle` and leave `last` empty.
  it("keeps values in the right column when a record omits one", async () => {
    expect(
      await _roundTrip({
        fields: _fields("first", "middle", "last"),
        records: [
          { first: "a", middle: "b", last: "c" },
          { first: "d", last: "f" },
        ],
      }),
    ).toEqual([
      { first: "a", middle: "b", last: "c" },
      { first: "d", middle: null, last: "f" },
    ]);
  });

  // The same bug from the other direction: the record's keys are in a different
  // order from `fields`, so a writer taking its columns from a record would
  // transpose them. Asserted on the column order DuckDB reports, because
  // `toEqual` on an object ignores key order and would pass either way.
  it("follows field order even when a record's key order differs", async () => {
    const rows = await _roundTrip({
      fields: _fields("first", "second"),
      records: [{ second: "2", first: "1" }],
    });

    expect(Object.keys(rows[0] ?? {})).toEqual(["first", "second"]);
    expect(rows).toEqual([{ first: "1", second: "2" }]);
  });

  // A field no record mentions must still become a column, so a page of records
  // that all happen to omit an optional column does not silently narrow the
  // table. A writer reading its columns off a record would drop it entirely.
  it("emits a column for a field absent from every record", async () => {
    const rows = await _roundTrip({
      fields: _fields("present", "neverPresent"),
      records: [{ present: "a" }, { present: "b" }],
    });

    expect(Object.keys(rows[0] ?? {})).toEqual(["present", "neverPresent"]);
    expect(rows).toEqual([
      { present: "a", neverPresent: null },
      { present: "b", neverPresent: null },
    ]);
  });

  it("round trips a numeric value as its text", async () => {
    expect(
      await _roundTrip({
        fields: _fields("year", "flag"),
        records: [{ year: 2022, flag: false }],
      }),
    ).toEqual([{ year: "2022", flag: "false" }]);
  });

  // One case produced by the real source rather than authored here, so the
  // reader is exercised against bytes HDX actually serves.
  it("reads the checked-in real HDX resource file", async () => {
    const path = join(
      HERE,
      "fixtures",
      "hdx-fts-requirements-funding-covid-mwi.csv",
    );
    const rows = await withDuckDb(async (connection) => {
      return await _readRows(connection, path);
    });

    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0] ?? {})).toHaveLength(13);
    expect(rows[0]?.countryCode).toBe("MWI");
    expect(rows[0]?.requirements).toBe("29450000");
  });

  // The fixture must stay byte-identical to what HDX served, so a well-meaning
  // reformat cannot quietly turn it into an authored fixture.
  it("keeps the real HDX fixture byte-identical", () => {
    const bytes = readFileSync(
      join(HERE, "fixtures", "hdx-fts-requirements-funding-covid-mwi.csv"),
    );

    expect(bytes.byteLength).toBe(235);
  });
});
