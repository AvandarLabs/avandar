/**
 * Load-strategy selection for a lat/lng point layer: when the browser may
 * receive rows directly, when DuckDB must aggregate them first, and how the
 * grid is coarsened so the row count handed over stays bounded.
 */
import { describe, expect, it, vi } from "vitest";
import { getPointAggregateCellsAcross } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/getPointAggregateCellsAcross";
import {
  POINT_AGGREGATE_MAX_CELLS,
  POINT_AGGREGATE_ROW_THRESHOLD,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import {
  POINT_AGGREGATE_CELL_COUNT_COLUMN,
  runPointLayerQuery,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/runPointLayerQuery";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

const SOURCE_SQL = 'SELECT * FROM "cases"';

function _makeQueryResult(
  rows: readonly UnknownRow[],
): QueryResult.T<UnknownRow> {
  return {
    id: "result",
    columns: [],
    data: [...rows],
    numRows: rows.length,
  } as unknown as QueryResult.T<UnknownRow>;
}

/**
 * A runner that answers each of the three query shapes the loader can issue,
 * dispatching on the result column each shape is defined by rather than on
 * call order, so a reordering of the loader's steps does not silently pass.
 */
function _makeRunner(
  options: Readonly<{
    sourceRowCount: number;
    mappableRowCount?: number;
    distinctCoordinateCount?: number;
    dropNullCoordinateCount?: number;
    /** Cells the grid produces, by the resolution asked for. */
    cellCountByCellsAcross?: (cellsAcross: number) => number;
  }>,
): {
  runQuery: (rawSql: string) => Promise<QueryResult.T<UnknownRow>>;
  calls: string[];
} {
  const calls: string[] = [];
  const mappableRowCount = options.mappableRowCount ?? options.sourceRowCount;
  const runQuery = vi.fn(async (rawSql: string) => {
    calls.push(rawSql);
    if (rawSql.includes("source_row_count")) {
      return _makeQueryResult([
        {
          source_row_count: options.sourceRowCount,
          mappable_row_count: mappableRowCount,
          distinct_coordinate_count:
            options.distinctCoordinateCount ?? mappableRowCount,
          drop_null_coordinate: options.dropNullCoordinateCount ?? 0,
          drop_non_numeric_coordinate: 0,
          drop_out_of_range: 0,
          drop_suspected_lat_lng_swap: 0,
          drop_null_island: 0,
        },
      ]);
    }
    if (rawSql.includes(POINT_AGGREGATE_CELL_COUNT_COLUMN)) {
      const cellsAcross = Number(/least\((\d+),/.exec(rawSql)?.[1] ?? "0") + 1;
      return _makeQueryResult([
        {
          [POINT_AGGREGATE_CELL_COUNT_COLUMN]:
            options.cellCountByCellsAcross?.(cellsAcross) ?? 1,
        },
      ]);
    }
    return _makeQueryResult([{ lat: 1, lon: 2, point_count: 3 }]);
  });
  return { runQuery, calls };
}

async function _run(
  options: Readonly<{
    runQuery: (rawSql: string) => Promise<QueryResult.T<UnknownRow>>;
    zoomBand?: number;
    valueColumnName?: string;
  }>,
) {
  return await runPointLayerQuery({
    runQuery: options.runQuery,
    sourceSql: SOURCE_SQL,
    latitudeColumnName: "lat",
    longitudeColumnName: "lon",
    valueColumnName: options.valueColumnName,
    zoomBand: options.zoomBand ?? 8,
  });
}

describe("runPointLayerQuery", () => {
  it("loads rows directly when the layer is small enough to convert", async () => {
    const { runQuery, calls } = _makeRunner({ sourceRowCount: 500 });
    const result = await _run({ runQuery });
    expect(result.aggregation).toBeUndefined();
    expect(calls.at(-1)).toBe(SOURCE_SQL);
  });

  it("aggregates in SQL once the layer exceeds the conversion threshold", async () => {
    const { runQuery, calls } = _makeRunner({
      sourceRowCount: POINT_AGGREGATE_ROW_THRESHOLD + 1,
    });
    const result = await _run({ runQuery });
    expect(result.aggregation).toBeDefined();
    expect(calls.at(-1)).not.toBe(SOURCE_SQL);
    expect(calls.at(-1)).toContain("point_count");
  });

  it("decides on mappable rows, not on rows a map cannot place", async () => {
    // A layer whose rows are mostly unmappable does not need aggregating just
    // because the source is large: only placeable rows become features.
    const { runQuery } = _makeRunner({
      sourceRowCount: POINT_AGGREGATE_ROW_THRESHOLD * 10,
      mappableRowCount: 100,
      dropNullCoordinateCount: POINT_AGGREGATE_ROW_THRESHOLD * 10 - 100,
    });
    const result = await _run({ runQuery });
    expect(result.aggregation).toBeUndefined();
  });

  it("reports the rows a map cannot place whichever path it took", async () => {
    const { runQuery } = _makeRunner({
      sourceRowCount: POINT_AGGREGATE_ROW_THRESHOLD + 100,
      mappableRowCount: POINT_AGGREGATE_ROW_THRESHOLD + 40,
      dropNullCoordinateCount: 60,
    });
    const result = await _run({ runQuery });
    expect(result.audit.drops).toEqual([
      { reason: "nullCoordinate", count: 60 },
    ]);
    expect(result.audit.sourceRowCount).toBe(
      POINT_AGGREGATE_ROW_THRESHOLD + 100,
    );
  });

  it("aggregates at the resolution the current zoom asks for", async () => {
    const { runQuery } = _makeRunner({
      sourceRowCount: POINT_AGGREGATE_ROW_THRESHOLD + 1,
    });
    const result = await _run({ runQuery, zoomBand: 6 });
    expect(result.aggregation?.cellsAcross).toBe(
      getPointAggregateCellsAcross({ zoomBand: 6 }),
    );
    expect(result.aggregation?.didCoarsenGrid).toBe(false);
  });

  it("coarsens the grid when the requested resolution exceeds the cell ceiling", async () => {
    const requested = getPointAggregateCellsAcross({ zoomBand: 12 });
    const { runQuery } = _makeRunner({
      sourceRowCount: POINT_AGGREGATE_ROW_THRESHOLD + 1,
      distinctCoordinateCount: POINT_AGGREGATE_MAX_CELLS * 10,
      // Only resolutions well below the requested one fit under the ceiling.
      cellCountByCellsAcross: (cellsAcross) => {
        return cellsAcross > requested / 8 ?
            POINT_AGGREGATE_MAX_CELLS + 1
          : POINT_AGGREGATE_MAX_CELLS - 1;
      },
    });
    const result = await _run({ runQuery, zoomBand: 12 });
    expect(result.aggregation?.didCoarsenGrid).toBe(true);
    expect(result.aggregation?.cellsAcross).toBeLessThan(requested);
  });

  it("stops coarsening at the whole-world grid rather than looping forever", async () => {
    const { runQuery } = _makeRunner({
      sourceRowCount: POINT_AGGREGATE_ROW_THRESHOLD + 1,
      distinctCoordinateCount: POINT_AGGREGATE_MAX_CELLS * 10,
      // No resolution ever fits, which must still terminate.
      cellCountByCellsAcross: () => {
        return POINT_AGGREGATE_MAX_CELLS + 1;
      },
    });
    const result = await _run({ runQuery, zoomBand: 20 });
    expect(result.aggregation?.cellsAcross).toBe(
      getPointAggregateCellsAcross({ zoomBand: 0 }),
    );
    expect(result.aggregation?.didCoarsenGrid).toBe(true);
  });

  it("skips probing resolutions when distinct coordinates already fit", async () => {
    // No grid can produce more cells than there are distinct coordinates, so a
    // layer of millions of rows over a few thousand places needs no probe.
    const { runQuery, calls } = _makeRunner({
      sourceRowCount: 3_800_000,
      distinctCoordinateCount: 3_228,
    });
    const result = await _run({ runQuery, zoomBand: 12 });
    expect(
      calls.some((sql) => {
        return sql.includes(POINT_AGGREGATE_CELL_COUNT_COLUMN);
      }),
    ).toBe(false);
    expect(result.aggregation?.cellsAcross).toBe(
      getPointAggregateCellsAcross({ zoomBand: 12 }),
    );
  });

  it("probes resolutions when distinct coordinates could exceed the ceiling", async () => {
    const { runQuery, calls } = _makeRunner({
      sourceRowCount: 3_800_000,
      distinctCoordinateCount: POINT_AGGREGATE_MAX_CELLS + 1,
    });
    await _run({ runQuery, zoomBand: 12 });
    expect(
      calls.some((sql) => {
        return sql.includes(POINT_AGGREGATE_CELL_COUNT_COLUMN);
      }),
    ).toBe(true);
  });

  it("carries the painted value column into the aggregate", async () => {
    const { runQuery, calls } = _makeRunner({
      sourceRowCount: POINT_AGGREGATE_ROW_THRESHOLD + 1,
    });
    await _run({ runQuery, valueColumnName: "deaths" });
    expect(calls.at(-1)).toContain('sum(__point_aggregate_value) AS "deaths"');
  });

  it("counts the source rows the aggregated cells stand for", async () => {
    const { runQuery } = _makeRunner({
      sourceRowCount: 4_000_000,
      mappableRowCount: 3_900_000,
      dropNullCoordinateCount: 100_000,
    });
    const result = await _run({ runQuery });
    expect(result.aggregation?.aggregatedRowCount).toBe(3_900_000);
  });

  it("treats a source that matches nothing as an ordinary empty layer", async () => {
    const { runQuery, calls } = _makeRunner({ sourceRowCount: 0 });
    const result = await _run({ runQuery });
    expect(result.aggregation).toBeUndefined();
    expect(result.audit.sourceRowCount).toBe(0);
    expect(calls.at(-1)).toBe(SOURCE_SQL);
  });
});
