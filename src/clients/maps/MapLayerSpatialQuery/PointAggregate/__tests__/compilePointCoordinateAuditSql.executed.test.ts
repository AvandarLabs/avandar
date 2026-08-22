import type { PointCoordinateAudit } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.types";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Row-level tests for {@link compilePointCoordinateAuditSql}, the query that
 * decides whether a point layer needs SQL-side aggregation and counts the rows
 * a map cannot place.
 *
 * The counts matter as much as the decision: they are what the layer's
 * "N of M rows mapped" status reports once the browser no longer sees every
 * row, so a wrong count here means the map claims coverage it does not have.
 */
import { describe, expect, it } from "vitest";

import { compilePointCoordinateAuditSql } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/compilePointCoordinateAuditSql";
import { parsePointCoordinateAuditRow } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/parsePointCoordinateAuditRow";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";

async function _runAudit(sourceSql: string): Promise<PointCoordinateAudit> {
  const sql = compilePointCoordinateAuditSql({
    sourceSql,
    latitudeColumnName: "lat",
    longitudeColumnName: "lon",
  });
  const row = await withDuckDb(async (connection: DuckDBConnection) => {
    const result = await connection.runAndReadAll(sql);
    return result.getRowObjects()[0];
  });
  return parsePointCoordinateAuditRow(row);
}

/** Builds source SQL from literal coordinate pairs, as VARCHAR like a CSV. */
function _makeSourceSql(
  pairs: ReadonlyArray<readonly [string, string]>,
): string {
  const values = pairs
    .map(([lon, lat]) => {
      return `(${lon}, ${lat})`;
    })
    .join(", ");
  return `SELECT * FROM (VALUES ${values}) AS t(lon, lat)`;
}

describe("compilePointCoordinateAuditSql executed", () => {
  it("counts every source row, mappable or not", async () => {
    const audit = await _runAudit(
      _makeSourceSql([
        ["'10.0'", "'10.0'"],
        ["NULL", "'10.0'"],
        ["'0.0'", "'0.0'"],
      ]),
    );
    expect(audit.sourceRowCount).toBe(3);
  });

  it("counts rows a map can place", async () => {
    const audit = await _runAudit(
      _makeSourceSql([
        ["'10.0'", "'10.0'"],
        ["'11.0'", "'11.0'"],
        ["NULL", "'10.0'"],
      ]),
    );
    expect(audit.mappableRowCount).toBe(2);
  });

  it("reports a missing coordinate as a null coordinate", async () => {
    const audit = await _runAudit(
      _makeSourceSql([
        ["NULL", "'10.0'"],
        ["'10.0'", "NULL"],
      ]),
    );
    expect(audit.drops).toEqual([{ reason: "nullCoordinate", count: 2 }]);
  });

  it("reports text that is not a number as a non-numeric coordinate", async () => {
    const audit = await _runAudit(_makeSourceSql([["'east'", "'north'"]]));
    expect(audit.drops).toEqual([{ reason: "nonNumericCoordinate", count: 1 }]);
  });

  it("reports the null island separately from other invalid coordinates", async () => {
    const audit = await _runAudit(_makeSourceSql([["'0'", "'0'"]]));
    expect(audit.drops).toEqual([{ reason: "nullIsland", count: 1 }]);
  });

  it("reports a swappable out-of-range pair as a suspected swap", async () => {
    // A latitude of 120 cannot be a latitude but works as a longitude, and 45
    // works as a latitude, so swapping them would actually produce a valid
    // point.
    const audit = await _runAudit(_makeSourceSql([["'45.0'", "'120.0'"]]));
    expect(audit.drops).toEqual([{ reason: "suspectedLatLngSwap", count: 1 }]);
  });

  it("reports an unswappable out-of-range pair as out of range", async () => {
    const audit = await _runAudit(_makeSourceSql([["'400.0'", "'500.0'"]]));
    expect(audit.drops).toEqual([{ reason: "outOfRange", count: 1 }]);
  });

  it("omits reasons that no row hit", async () => {
    const audit = await _runAudit(_makeSourceSql([["'10.0'", "'10.0'"]]));
    expect(audit.drops).toEqual([]);
  });

  it("accounts for every row across mappable rows and drops", async () => {
    const audit = await _runAudit(
      _makeSourceSql([
        ["'10.0'", "'10.0'"],
        ["NULL", "'10.0'"],
        ["'east'", "'north'"],
        ["'0'", "'0'"],
        ["'45.0'", "'120.0'"],
        ["'400.0'", "'500.0'"],
      ]),
    );
    const droppedRowCount = audit.drops.reduce((total, drop) => {
      return total + drop.count;
    }, 0);
    expect(audit.mappableRowCount + droppedRowCount).toBe(audit.sourceRowCount);
  });

  it("counts distinct coordinates, not distinct rows", async () => {
    // The upper bound the aggregation relies on to skip probing resolutions:
    // rows sharing a coordinate can never land in different cells.
    const audit = await _runAudit(
      _makeSourceSql([
        ["'10.0'", "'10.0'"],
        ["'10.0'", "'10.0'"],
        ["'10.0'", "'10.0'"],
        ["'11.0'", "'11.0'"],
      ]),
    );
    expect(audit.mappableRowCount).toBe(4);
    expect(audit.distinctCoordinateCount).toBe(2);
  });

  it("excludes unmappable rows from the distinct coordinate count", async () => {
    const audit = await _runAudit(
      _makeSourceSql([
        ["'10.0'", "'10.0'"],
        ["NULL", "'10.0'"],
        ["'0'", "'0'"],
      ]),
    );
    expect(audit.distinctCoordinateCount).toBe(1);
  });

  it("counts a point near the pole as mappable", async () => {
    const audit = await _runAudit(_makeSourceSql([["'10.0'", "'89.9'"]]));
    expect(audit.mappableRowCount).toBe(1);
    expect(audit.drops).toEqual([]);
  });
});
