import type {
  PointCoordinateAudit,
  PointCoordinateDrop,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.types";
import type { DropReason } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";

import {
  PointCoordinateAuditColumns,
  PointCoordinateDropColumns,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/compilePointCoordinateAuditSql";

/**
 * Reads one count off the audit row.
 *
 * DuckDB returns `count(*)` as a 64-bit integer, which reaches JavaScript as
 * a `bigint` through the Node client and as a `number` once the browser's
 * Arrow conversion has narrowed it, so both are accepted.
 */
function _getCount(value: unknown): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Collects the reasons at least one row hit, in declaration order. */
function _getDrops(row: Record<string, unknown>): PointCoordinateDrop[] {
  return (Object.keys(PointCoordinateDropColumns) as DropReason[]).flatMap(
    (reason) => {
      const count = _getCount(row[PointCoordinateDropColumns[reason]]);
      return count > 0 ? [{ reason, count }] : [];
    },
  );
}

/**
 * Parses the single row {@link compilePointCoordinateAuditSql} returns.
 *
 * A missing row is read as an empty source rather than an error: a layer whose
 * filters match nothing is an ordinary empty layer, not a failure.
 *
 * @param row The audit query's only result row.
 * @returns The source's row counts and the reasons rows could not be mapped.
 */
export function parsePointCoordinateAuditRow(
  row: Record<string, unknown> | undefined,
): PointCoordinateAudit {
  if (!row) {
    return {
      sourceRowCount: 0,
      mappableRowCount: 0,
      distinctCoordinateCount: 0,
      drops: [],
    };
  }
  return {
    sourceRowCount: _getCount(row[PointCoordinateAuditColumns.sourceRowCount]),
    mappableRowCount: _getCount(
      row[PointCoordinateAuditColumns.mappableRowCount],
    ),
    distinctCoordinateCount: _getCount(
      row[PointCoordinateAuditColumns.distinctCoordinateCount],
    ),
    drops: _getDrops(row),
  };
}
