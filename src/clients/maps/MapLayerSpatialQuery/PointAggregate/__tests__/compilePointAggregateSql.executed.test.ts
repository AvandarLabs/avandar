import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Row-level tests for {@link compilePointAggregateSql}. Every case runs the
 * emitted SQL against a real in-memory DuckDB and asserts the rows returned.
 *
 * Executing the SQL rather than snapshotting it is the point: the aggregation's
 * whole job is to collapse millions of rows into a bounded set of cells without
 * losing any of them, and only real rows can show that the Web Mercator cell
 * math, the grouping, and the per-cell sums actually agree.
 */
import { describe, expect, it } from "vitest";

import { compilePointAggregateSql } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/compilePointAggregateSql";
import { getPointAggregateCellsAcross } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/getPointAggregateCellsAcross";
import { PointAggregateProperties } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";

/**
 * Two tight pairs about 11m apart within each pair, and a third point on
 * another continent, plus rows the coordinate filter must exclude.
 */
const FIXTURE_SQL = `
  CREATE TABLE observations AS SELECT * FROM (VALUES
    (10.0000, 10.0000, 5,   'a'),
    (10.0001, 10.0001, 7,   'b'),
    (10.0002, 10.0002, 2,   'c'),
    (-70.0000, 40.0000, 11, 'd'),
    (-70.0001, 40.0001, 4,  'e'),
    (NULL, 20.0000, 3,      'f'),
    (30.0000, NULL, 3,      'g'),
    (0.0000, 0.0000, 3,     'h'),
    (400.0000, 500.0000, 3, 'i')
  ) AS t(lon, lat, deaths, label);
`;

const SOURCE_SQL = 'SELECT * FROM "observations"';

/** Rows in the fixture that carry a coordinate a map can actually place. */
const MAPPABLE_ROW_COUNT = 5;

type AggregateRow = {
  lat: number;
  lon: number;
  point_count: number;
  point_count_abbreviated: string;
  deaths?: number;
};

async function _runAggregate(
  options: Readonly<{
    cellsAcross: number;
    valueColumnName?: string;
    sourceSql?: string;
  }>,
): Promise<AggregateRow[]> {
  const sql = compilePointAggregateSql({
    sourceSql: options.sourceSql ?? SOURCE_SQL,
    latitudeColumnName: "lat",
    longitudeColumnName: "lon",
    cellsAcross: options.cellsAcross,
    valueColumnName: options.valueColumnName,
  });
  return await withDuckDb(async (connection: DuckDBConnection) => {
    await connection.run(FIXTURE_SQL);
    const result = await connection.runAndReadAll(sql);
    return result.getRowObjects().map((row) => {
      return {
        lat: Number(row.lat),
        lon: Number(row.lon),
        point_count: Number(row[PointAggregateProperties.pointCount]),
        point_count_abbreviated: String(
          row[PointAggregateProperties.abbreviated],
        ),
        ...(row.deaths === undefined ? {} : { deaths: Number(row.deaths) }),
      };
    });
  });
}

function _sumPointCounts(rows: readonly AggregateRow[]): number {
  return rows.reduce((total, row) => {
    return total + row.point_count;
  }, 0);
}

describe("compilePointAggregateSql executed", () => {
  it("accounts for every mappable source row exactly once", async () => {
    const rows = await _runAggregate({ cellsAcross: 32 });
    expect(_sumPointCounts(rows)).toBe(MAPPABLE_ROW_COUNT);
  });

  it("excludes rows a map cannot place rather than mapping them wrongly", async () => {
    // Null, null-island, and out-of-range coordinates are all left out; the
    // coordinate audit reports them, so nothing is silently pretended to fit.
    const rows = await _runAggregate({ cellsAcross: 1_000_000 });
    expect(_sumPointCounts(rows)).toBe(MAPPABLE_ROW_COUNT);
    expect(
      rows.every((row) => {
        return Number.isFinite(row.lat);
      }),
    ).toBe(true);
    expect(
      rows.every((row) => {
        return Math.abs(row.lat) <= 90;
      }),
    ).toBe(true);
  });

  it("collapses a tight group into one cell at a coarse resolution", async () => {
    const rows = await _runAggregate({ cellsAcross: 32 });
    // Two groups an ocean apart, so a 32-cell world separates them and
    // nothing else.
    expect(rows).toHaveLength(2);
    const counts = rows
      .map((row) => {
        return row.point_count;
      })
      .sort();
    expect(counts).toEqual([2, 3]);
  });

  it("separates the same points into their own cells at a fine resolution", async () => {
    const rows = await _runAggregate({ cellsAcross: 100_000_000 });
    expect(rows).toHaveLength(MAPPABLE_ROW_COUNT);
    expect(
      rows.every((row) => {
        return row.point_count === 1;
      }),
    ).toBe(true);
  });

  it("never returns more cells as resolution drops", async () => {
    const fine = await _runAggregate({ cellsAcross: 100_000_000 });
    const medium = await _runAggregate({ cellsAcross: 4096 });
    const coarse = await _runAggregate({ cellsAcross: 4 });
    expect(medium.length).toBeLessThanOrEqual(fine.length);
    expect(coarse.length).toBeLessThanOrEqual(medium.length);
  });

  it("reports each cell at the mean coordinate of its rows", async () => {
    const rows = await _runAggregate({ cellsAcross: 32 });
    const tightGroup = rows.find((row) => {
      return row.point_count === 3;
    });
    expect(tightGroup?.lat).toBeCloseTo(10.0001, 6);
    expect(tightGroup?.lon).toBeCloseTo(10.0001, 6);
  });

  it("sums the value column within each cell", async () => {
    const rows = await _runAggregate({
      cellsAcross: 32,
      valueColumnName: "deaths",
    });
    const tightGroup = rows.find((row) => {
      return row.point_count === 3;
    });
    // 5 + 7 + 2: the cell's total, so symbol size still encodes the data
    // value rather than silently switching to encode a row count.
    expect(tightGroup?.deaths).toBe(14);
  });

  it("omits the value column when the layer paints no value", async () => {
    const rows = await _runAggregate({ cellsAcross: 32 });
    expect(
      rows.every((row) => {
        return row.deaths === undefined;
      }),
    ).toBe(true);
  });

  it("counts a point past the Mercator limit instead of dropping it", async () => {
    const rows = await _runAggregate({
      cellsAcross: 64,
      sourceSql: `SELECT * FROM (VALUES
        (10.0, 89.9, 1, 'pole'),
        (10.0, -89.9, 1, 'antipole')
      ) AS t(lon, lat, deaths, label)`,
    });
    expect(_sumPointCounts(rows)).toBe(2);
    expect(
      rows.every((row) => {
        return Number.isFinite(row.lat) && Number.isFinite(row.lon);
      }),
    ).toBe(true);
  });

  it("abbreviates counts the way MapLibre labels its own clusters", async () => {
    const rows = await _runAggregate({
      cellsAcross: 2,
      sourceSql: `SELECT 10.0 AS lon, 10.0 AS lat, 1 AS deaths, 'x' AS label
        FROM range(1500)`,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.point_count).toBe(1500);
    expect(rows[0]?.point_count_abbreviated).toBe("1.5k");
  });

  it("keeps counts under a thousand unabbreviated", async () => {
    const rows = await _runAggregate({ cellsAcross: 32 });
    expect(
      rows.map((row) => {
        return row.point_count_abbreviated;
      }),
    ).toEqual(expect.arrayContaining(["3", "2"]));
  });

  it("bounds output by the grid a real zoom level asks for", async () => {
    const rows = await _runAggregate({
      cellsAcross: getPointAggregateCellsAcross({ zoomBand: 0 }),
    });
    // A zoom-0 world is 11 cells across, so it cannot return more than 121
    // rows however many source rows there are.
    expect(rows.length).toBeLessThanOrEqual(121);
  });
});
