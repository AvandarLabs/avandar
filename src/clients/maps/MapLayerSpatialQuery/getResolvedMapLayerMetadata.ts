import { Model } from "@avandar/models";
import { propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { match } from "ts-pattern";
import type {
  MapLayerMetadataResolution,
  MapLayerRebindReason,
  MapLayerRebindRequired,
  ResolvedBoundarySource,
} from "./MapLayerSpatialQuery.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

type ResolveOptions = {
  layer: MapLayer.T;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
};

type BoundaryBinding = Extract<
  MapLayer.GeoBinding,
  { type: "joinToBoundaries" | "aggregatePointsToBoundaries" }
>;

type ResolvedDenominator = NonNullable<
  Extract<
    MapLayerMetadataResolution,
    { type: "resolved" }
  >["normalizationDenominator"]
>;

/** Creates one actionable rebind result. */
function _createRebindRequired(
  reason: MapLayerRebindReason,
  referenceId: string,
): MapLayerRebindRequired {
  return { type: "rebindRequired", reason, referenceId };
}

/** Returns the boundary-dependent form of a layer binding. */
function _getBoundaryBinding(layer: MapLayer.T): BoundaryBinding | undefined {
  const { geoBinding } = layer;
  return (
      geoBinding?.type === "joinToBoundaries" ||
        geoBinding?.type === "aggregatePointsToBoundaries"
    ) ?
      geoBinding
    : undefined;
}

/** Returns every source column persisted by a geometry binding. */
function _getRequiredSourceColumnIds(
  binding: MapLayer.GeoBinding | undefined,
): readonly QueryColumn.Id[] {
  if (!binding) {
    return [];
  }
  return match(binding)
    .with({ type: "latLngColumns" }, ({ latitude, longitude }) => {
      return [latitude, longitude].filter(
        (columnId): columnId is QueryColumn.Id => {
          return columnId !== undefined;
        },
      );
    })
    .with({ type: "geometryColumn" }, ({ column }) => {
      return [column];
    })
    .with({ type: "joinToBoundaries" }, ({ dataKeyColumn }) => {
      return [dataKeyColumn];
    })
    .with({ type: "aggregatePointsToBoundaries" }, ({ points }) => {
      return _getRequiredSourceColumnIds(points);
    })
    .exhaustive();
}

/** Finds one column only when it still belongs to the referenced dataset. */
function _findBoundaryColumn(
  columns: readonly DatasetColumn.T[],
  datasetId: Dataset.Id,
  columnId: DatasetColumn.Id,
): DatasetColumn.T | undefined {
  return columns.find((column) => {
    return column.id === columnId && column.datasetId === datasetId;
  });
}

/** Resolves all columns of one persisted boundary reference. */
function _getResolvedBoundary(
  binding: BoundaryBinding,
  datasets: readonly Dataset.T[],
  columns: readonly DatasetColumn.T[],
): ResolvedBoundarySource | MapLayerMetadataResolution {
  const { boundary } = binding;
  const dataset = datasets.find(propEq("id", boundary.datasetId));
  if (!dataset) {
    return _createRebindRequired("missingBoundaryDataset", boundary.datasetId);
  }
  const geometryColumn = _findBoundaryColumn(
    columns,
    dataset.id,
    boundary.geometryColumnId,
  );
  if (!geometryColumn) {
    return _createRebindRequired(
      "missingBoundaryGeometryColumn",
      boundary.geometryColumnId,
    );
  }
  return _getResolvedBoundaryWithGeometry({
    binding,
    dataset,
    geometryColumn,
    columns,
  });
}

/** Resolves key and optional display columns after geometry is known. */
function _getResolvedBoundaryWithGeometry(options: {
  binding: BoundaryBinding;
  dataset: Dataset.T;
  geometryColumn: DatasetColumn.T;
  columns: readonly DatasetColumn.T[];
}): ResolvedBoundarySource | MapLayerMetadataResolution {
  const { boundary } = options.binding;
  const keyColumn = _findBoundaryColumn(
    options.columns,
    options.dataset.id,
    boundary.keyColumnId,
  );
  if (!keyColumn) {
    return _createRebindRequired(
      "missingBoundaryKeyColumn",
      boundary.keyColumnId,
    );
  }
  const displayNameColumn =
    boundary.displayNameColumnId ?
      _findBoundaryColumn(
        options.columns,
        options.dataset.id,
        boundary.displayNameColumnId,
      )
    : undefined;
  if (boundary.displayNameColumnId && !displayNameColumn) {
    return _createRebindRequired(
      "missingBoundaryDisplayNameColumn",
      boundary.displayNameColumnId,
    );
  }
  return {
    datasetId: options.dataset.id,
    datasetName: options.dataset.name,
    geometryColumnName: options.geometryColumn.name,
    geometryEncoding: boundary.geometryEncoding,
    keyColumnName: keyColumn.name,
    displayNameColumnName: displayNameColumn?.name,
    simplification: boundary.simplification,
  };
}

/** Resolves and validates an optional non-count aggregation measure. */
function _getAggregationMeasure(
  layer: MapLayer.T,
  binding: BoundaryBinding,
): string | MapLayerMetadataResolution | undefined {
  const { aggregation } = binding;
  if (aggregation.operation === "count") {
    return undefined;
  }
  const queryColumn = layer.source.queryColumns.find(
    propEq("id", aggregation.measureColumn),
  );
  if (!queryColumn) {
    return _createRebindRequired(
      "missingSourceColumn",
      aggregation.measureColumn,
    );
  }
  if (!QueryColumn.isNumeric(queryColumn)) {
    return _createRebindRequired(
      "aggregationMeasureNotNumeric",
      queryColumn.baseColumn.id,
    );
  }
  return QueryColumn.getDerivedColumnName(queryColumn);
}

/** Resolves the optional denominator used by graduated symbology. */
function _getNormalizationDenominator(
  options: Readonly<ResolveOptions>,
  binding: BoundaryBinding | undefined,
): ResolvedDenominator | MapLayerRebindRequired | undefined {
  const color = options.layer.symbology.color;
  const normalization =
    color.type === "graduated" ? color.normalization : undefined;
  if (!normalization) {
    return undefined;
  }
  const { denominator } = normalization;
  if (denominator.type === "queryColumn") {
    if (binding?.type === "aggregatePointsToBoundaries") {
      return _createRebindRequired(
        "unsupportedNormalizationDenominator",
        denominator.column,
      );
    }
    const column = options.layer.source.queryColumns.find(
      propEq("id", denominator.column),
    );
    if (!column) {
      return _createRebindRequired("missingSourceColumn", denominator.column);
    }
    if (!QueryColumn.isNumeric(column)) {
      return _createRebindRequired(
        "normalizationDenominatorNotNumeric",
        denominator.column,
      );
    }
    return {
      type: "queryColumn",
      columnName: QueryColumn.getDerivedColumnName(column),
    };
  }
  if (!binding) {
    return _createRebindRequired(
      "unsupportedNormalizationDenominator",
      denominator.column,
    );
  }
  const column = _findBoundaryColumn(
    options.datasetColumns,
    binding.boundary.datasetId,
    denominator.column,
  );
  if (!column) {
    return _createRebindRequired(
      "missingBoundaryDenominatorColumn",
      denominator.column,
    );
  }
  const queryColumn = QueryColumn.makeFromDatasetColumn(column);
  if (!QueryColumn.isNumeric(queryColumn)) {
    return _createRebindRequired(
      "normalizationDenominatorNotNumeric",
      denominator.column,
    );
  }
  return { type: "boundaryColumn", columnName: column.name };
}

/** Resolves persisted layer references against current workspace metadata. */
export function getResolvedMapLayerMetadata(
  options: Readonly<ResolveOptions>,
): MapLayerMetadataResolution {
  const sourceColumnNames = new Map(
    options.layer.source.queryColumns.map((column) => {
      return [column.id, QueryColumn.getDerivedColumnName(column)];
    }),
  );
  const missingSourceColumnId = _getRequiredSourceColumnIds(
    options.layer.geoBinding,
  ).find((columnId) => {
    return !sourceColumnNames.has(columnId);
  });
  if (missingSourceColumnId) {
    return _createRebindRequired("missingSourceColumn", missingSourceColumnId);
  }
  const binding = _getBoundaryBinding(options.layer);
  const normalizationDenominator = _getNormalizationDenominator(
    options,
    binding,
  );
  if (
    normalizationDenominator &&
    "type" in normalizationDenominator &&
    normalizationDenominator.type === "rebindRequired"
  ) {
    return normalizationDenominator;
  }
  if (!binding) {
    return {
      type: "resolved",
      sourceColumnNames,
      boundary: undefined,
      aggregationMeasureColumnName: undefined,
      normalizationDenominator,
    };
  }
  const source = options.layer.source.dataSource;
  if (!Model.isOfModelType(source, "Dataset")) {
    return _createRebindRequired(
      "missingSourceDataset",
      source?.id ?? "unbound",
    );
  }
  const boundary = _getResolvedBoundary(
    binding,
    options.datasets,
    options.datasetColumns,
  );
  if ("type" in boundary) {
    return boundary;
  }
  const aggregationMeasure = _getAggregationMeasure(options.layer, binding);
  if (typeof aggregationMeasure !== "string" && aggregationMeasure) {
    return aggregationMeasure;
  }
  return {
    type: "resolved",
    sourceColumnNames,
    boundary,
    aggregationMeasureColumnName: aggregationMeasure,
    normalizationDenominator,
  };
}
