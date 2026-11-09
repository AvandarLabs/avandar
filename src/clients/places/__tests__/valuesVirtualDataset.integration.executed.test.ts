import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import { withDuckDb } from "../../../../tests/integration/queries/executedDuckDb";

/**
 * A places dataset's stored SQL reads no relation, so QETL must load it
 * without dependencies, and the Parquet it writes must keep the declared
 * column types.
 */

const STORED_VALUES_SQL = `SELECT * FROM (VALUES
  (CAST('p1' AS VARCHAR), 'O''Brien''s Café', CAST(NULL AS VARCHAR), CAST(40.7603 AS DOUBLE), CAST(-73.9885 AS DOUBLE), CAST('2026-10-02T18:00' AS TIMESTAMP), CAST(NULL AS TIMESTAMP), CAST(NULL AS VARCHAR))
) AS places(place_id, name, address, latitude, longitude, starts_at, ends_at, notes)`;

const EXPECTED_COLUMN_TYPES = {
  place_id: "VARCHAR",
  name: "VARCHAR",
  address: "VARCHAR",
  latitude: "DOUBLE",
  longitude: "DOUBLE",
  starts_at: "TIMESTAMP",
  ends_at: "TIMESTAMP",
  notes: "VARCHAR",
};

async function _describeParquetRoundTrip(): Promise<Record<string, string>> {
  const parquetPath = path.join(
    mkdtempSync(path.join(tmpdir(), "ava-places-spike-")),
    "places.parquet",
  );
  return await withDuckDb(async (connection) => {
    await connection.run(
      `COPY (${STORED_VALUES_SQL}) TO '${parquetPath}' (FORMAT PARQUET)`,
    );
    const described = await connection.runAndReadAll(
      `DESCRIBE SELECT * FROM '${parquetPath}'`,
    );
    return Object.fromEntries(
      described.getRowObjects().map((column) => {
        return [String(column.column_name), String(column.column_type)];
      }),
    );
  });
}

describe("a VALUES virtual dataset", () => {
  it("names no dataset QETL would have to load first", () => {
    expect(
      DuckDbSqlAnalyzer.getReadDatasetIdsFromSql(STORED_VALUES_SQL),
    ).toEqual([]);
  });

  it("writes Parquet whose column types match the declared places columns", async () => {
    expect(await _describeParquetRoundTrip()).toEqual(EXPECTED_COLUMN_TYPES);
  });
});
