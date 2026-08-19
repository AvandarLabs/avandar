import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import {
  createRebindRequired,
  findBoundaryColumn,
} from "./getResolvedMapLayerMetadataHelpers";
import type {
  MapLayerRebindRequired,
  ResolvedColumnRef,
} from "../MapLayerSpatialQuery.types";
import type {
  BoundaryBinding,
  ResolveOptions,
} from "./getResolvedMapLayerMetadata.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** Resolves the found-or-missing state of a `queryColumn` disputed ref. */
function _findQueryDisputedColumn(
  layer: MapLayer.T,
  columnId: QueryColumn.Id,
): { columnName: string; isText: boolean } | undefined {
  const column = layer.source.queryColumns.find(propEq("id", columnId));
  if (!column) {
    return undefined;
  }
  return {
    columnName: QueryColumn.getDerivedColumnName(column),
    isText: AvaDataType.isText(column.baseColumn.dataType),
  };
}

/** Resolves the found-or-missing state of a `boundaryColumn` disputed ref. */
function _findBoundaryDisputedColumn(
  columns: readonly DatasetColumn.T[],
  datasetId: Dataset.Id,
  columnId: DatasetColumn.Id,
): { columnName: string; isText: boolean } | undefined {
  const column = findBoundaryColumn(columns, datasetId, columnId);
  if (!column) {
    return undefined;
  }
  return {
    columnName: column.name,
    isText: AvaDataType.isText(column.dataType),
  };
}

/**
 * Builds one disputed-status column bind result or a rebind out of a
 * found-or-missing lookup. Shared by both `DisputedStatusRef` variants so
 * each only has to locate its column and hand off the found-or-missing/text
 * decision here.
 */
function _buildDisputedStatusColumnResult(
  found: { columnName: string; isText: boolean } | undefined,
  type: ResolvedColumnRef["type"],
  referenceId: string,
): ResolvedColumnRef | MapLayerRebindRequired {
  if (!found) {
    return createRebindRequired("missingDisputedStatusColumn", referenceId);
  }
  if (!found.isText) {
    return createRebindRequired("disputedStatusColumnNotText", referenceId);
  }
  return { type, columnName: found.columnName };
}

/**
 * Resolves the optional bind that colors disputed and undetermined boundary
 * lines. Mirrors normalization-denominator resolution: a `queryColumn` ref
 * reads the layer's own source query, a `boundaryColumn` ref reads the
 * boundary dataset, and either kind must resolve to a text column.
 */
export function getDisputedStatusColumn(
  options: Readonly<ResolveOptions>,
  binding: BoundaryBinding | undefined,
): ResolvedColumnRef | MapLayerRebindRequired | undefined {
  const reference = options.layer.disputedStatusColumn;
  if (!reference) {
    return undefined;
  }
  return match(reference)
    .with({ type: "queryColumn" }, ({ column: columnId }) => {
      return _buildDisputedStatusColumnResult(
        _findQueryDisputedColumn(options.layer, columnId),
        "queryColumn",
        columnId,
      );
    })
    .with({ type: "boundaryColumn" }, ({ column: columnId }) => {
      const boundary = binding?.boundary;
      if (!boundary) {
        return createRebindRequired(
          "unsupportedDisputedStatusColumn",
          columnId,
        );
      }
      return _buildDisputedStatusColumnResult(
        _findBoundaryDisputedColumn(
          options.datasetColumns,
          boundary.datasetId,
          columnId,
        ),
        "boundaryColumn",
        columnId,
      );
    })
    .exhaustive();
}
