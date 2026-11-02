import { compilePointAggregateSql } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/compilePointAggregateSql";
import { compilePointCoordinateAuditSql } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/compilePointCoordinateAuditSql";
import { getPointAggregateCellsAcross } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/getPointAggregateCellsAcross";
import { parsePointCoordinateAuditRow } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/parsePointCoordinateAuditRow";
import {
  POINT_AGGREGATE_MAX_CELLS,
  POINT_AGGREGATE_ROW_THRESHOLD,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  PointAggregation,
  PointCoordinateAudit,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.types";

/** Result column carrying how many cells a grid resolution would produce. */
export const POINT_AGGREGATE_CELL_COUNT_COLUMN = "point_aggregate_cell_count";

/** Runs one already-compiled statement against the layer's query session. */
export type PointLayerQueryRunner = (
  rawSql: string,
) => Promise<QueryResult.T<UnknownRow>>;

type RunPointLayerQueryOptions = {
  runQuery: PointLayerQueryRunner;

  /** The layer's filtered source SQL, time and AOI predicates included. */
  sourceSql: string;
  latitudeColumnName: string;
  longitudeColumnName: string;

  /** Numeric column driving data-dependent paint, if the symbology has one. */
  valueColumnName: string | undefined;

  /** The map's integer zoom, which sets the grid resolution. */
  zoomBand: number;
};

/** The filtered SQL and columns one point layer is aggregated over. */
export type PointLayerSource = Pick<
  RunPointLayerQueryOptions,
  "sourceSql" | "latitudeColumnName" | "longitudeColumnName" | "valueColumnName"
>;

/** How one point layer's rows were loaded, and what they stand for. */
export type PointLayerQueryResult = {
  queryResult: QueryResult.T<UnknownRow>;
  audit: PointCoordinateAudit;

  /** Present only when DuckDB aggregated the rows before returning them. */
  aggregation: PointAggregation | undefined;
};

/** Reads the layer's row counts and unmappable-coordinate breakdown. */
async function _runCoordinateAudit(
  options: Readonly<RunPointLayerQueryOptions>,
): Promise<PointCoordinateAudit> {
  const result = await options.runQuery(
    compilePointCoordinateAuditSql({
      sourceSql: options.sourceSql,
      latitudeColumnName: options.latitudeColumnName,
      longitudeColumnName: options.longitudeColumnName,
    }),
  );
  return parsePointCoordinateAuditRow(result.data[0]);
}

/** Builds the aggregate for one resolution, without executing it. */
function _compileAggregate(
  options: Readonly<RunPointLayerQueryOptions>,
  cellsAcross: number,
): string {
  return compilePointAggregateSql({
    sourceSql: options.sourceSql,
    latitudeColumnName: options.latitudeColumnName,
    longitudeColumnName: options.longitudeColumnName,
    valueColumnName: options.valueColumnName,
    cellsAcross,
  });
}

/**
 * Counts the cells one resolution would return, without returning them.
 *
 * Wrapping the aggregate itself rather than counting distinct cells separately
 * keeps this honest by construction: the number checked against the ceiling is
 * the number of rows that exact aggregate would hand over.
 */
async function _countCells(
  options: Readonly<RunPointLayerQueryOptions>,
  cellsAcross: number,
): Promise<number> {
  const result = await options.runQuery(
    `SELECT count(*) AS ${POINT_AGGREGATE_CELL_COUNT_COLUMN} FROM (${_compileAggregate(options, cellsAcross)}) AS point_aggregate_cells`,
  );
  const count = result.data[0]?.[POINT_AGGREGATE_CELL_COUNT_COLUMN];
  return typeof count === "bigint"
    ? Number(count)
    : typeof count === "number"
      ? count
      : 0;
}

/**
 * Finds the finest grid whose cell count fits under
 * {@link POINT_AGGREGATE_MAX_CELLS}, starting from the resolution the current
 * zoom asks for and halving until it fits.
 *
 * Coarsening groups more rows into each cell; it never discards one, so the
 * layer still represents every mappable row at any resolution. Zoom 0 is the
 * floor: a whole-world grid is as coarse as the aggregation goes, and returning
 * it even when it does not fit is better than looping.
 *
 * Layers whose distinct coordinates already fit the ceiling skip the probing
 * entirely, since no grid can produce more cells than there are coordinates
 * to put in them. That is the common case for reporting data, where many rows
 * share few locations, and it saves a full scan on every zoom change.
 */
async function _resolveCellsAcross(
  options: Readonly<RunPointLayerQueryOptions>,
  audit: PointCoordinateAudit,
): Promise<{ cellsAcross: number; didCoarsenGrid: boolean }> {
  const requestedZoomBand = Math.max(0, Math.floor(options.zoomBand));
  if (audit.distinctCoordinateCount <= POINT_AGGREGATE_MAX_CELLS) {
    return {
      cellsAcross: getPointAggregateCellsAcross({
        zoomBand: requestedZoomBand,
      }),
      didCoarsenGrid: false,
    };
  }
  for (let zoomBand = requestedZoomBand; zoomBand > 0; zoomBand -= 1) {
    const cellsAcross = getPointAggregateCellsAcross({ zoomBand });
    const cellCount = await _countCells(options, cellsAcross);
    if (cellCount <= POINT_AGGREGATE_MAX_CELLS) {
      return { cellsAcross, didCoarsenGrid: zoomBand !== requestedZoomBand };
    }
  }
  return {
    cellsAcross: getPointAggregateCellsAcross({ zoomBand: 0 }),
    didCoarsenGrid: requestedZoomBand !== 0,
  };
}

/**
 * Loads one lat/lng point layer, aggregating it in DuckDB when converting every
 * row in the browser would cost more heap than the tab has.
 *
 * A point layer's cost in the browser is per row twice over, once as a plain
 * object and again as a GeoJSON feature, so a few million rows exhausts the
 * heap before MapLibre is handed anything to draw. Above
 * {@link POINT_AGGREGATE_ROW_THRESHOLD} this returns one row per grid cell
 * instead, sized to the current zoom, which keeps the browser's cost
 * proportional to what is on screen. Below it, rows are returned untouched, so
 * a small layer keeps every source row available for popups and for MapLibre's
 * own cluster expansion.
 *
 * The decision is made on rows that carry a usable coordinate, since those are
 * the only ones that become features, and the audit's counts travel with the
 * result either way so the layer can still report how many rows it could not
 * map.
 *
 * @param options.runQuery Runs one statement against the layer's session.
 * @param options.sourceSql The layer's filtered source SQL.
 * @param options.latitudeColumnName The layer's bound latitude column.
 * @param options.longitudeColumnName The layer's bound longitude column.
 * @param options.valueColumnName Numeric column to sum per cell, if any.
 * @param options.zoomBand The map's integer zoom.
 * @returns The rows to convert, the coordinate audit, and how the rows were
 * aggregated when they were.
 */
export async function runPointLayerQuery(
  options: Readonly<RunPointLayerQueryOptions>,
): Promise<PointLayerQueryResult> {
  const audit = await _runCoordinateAudit(options);
  if (audit.mappableRowCount <= POINT_AGGREGATE_ROW_THRESHOLD) {
    return {
      queryResult: await options.runQuery(options.sourceSql),
      audit,
      aggregation: undefined,
    };
  }

  const { cellsAcross, didCoarsenGrid } = await _resolveCellsAcross(
    options,
    audit,
  );
  return {
    queryResult: await options.runQuery(
      _compileAggregate(options, cellsAcross),
    ),
    audit,
    aggregation: {
      cellsAcross,
      aggregatedRowCount: audit.mappableRowCount,
      didCoarsenGrid,
    },
  };
}
