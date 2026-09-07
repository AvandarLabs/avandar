import { Model } from "@avandar/models";
import { isDefined, propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getDisputedStatusColumn } from "./getDisputedStatusColumn";
import {
  createRebindRequired,
  findBoundaryColumn,
} from "./getResolvedMapLayerMetadataHelpers";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type {
  MapLayerMetadataResolution,
  MapLayerRebindRequired,
  ResolvedBoundarySource,
} from "../MapLayerSpatialQuery.types";
import type {
  BoundaryBinding,
  ResolveOptions,
} from "./getResolvedMapLayerMetadata.types";

type AggregatingBinding = BoundaryBinding | MapLayer.GridBinBinding;

type ResolvedDenominator = NonNullable<
  Extract<
    MapLayerMetadataResolution,
    { type: "resolved" }
  >["normalizationDenominator"]
>;

/** Returns the boundary-dependent form of a layer binding. */
function _getBoundaryBinding(layer: MapLayer.T): BoundaryBinding | undefined {
  const { geoBinding } = layer;
  return geoBinding?.type === "joinToBoundaries" ||
    geoBinding?.type === "aggregatePointsToBoundaries"
    ? geoBinding
    : undefined;
}

/** Returns the binding form that aggregates source rows into areas. */
function _getAggregatingBinding(
  layer: MapLayer.T,
): AggregatingBinding | undefined {
  const { geoBinding } = layer;
  return geoBinding?.type === "binPointsToGrid"
    ? geoBinding
    : _getBoundaryBinding(layer);
}

/** Returns every source column persisted by a geometry binding. */
function _getRequiredSourceColumnIds(
  binding: MapLayer.GeoBinding | undefined,
): QueryColumn.Id[] {
  if (!binding) {
    return [];
  }
  return match(binding)
    .with({ type: "latLngColumns" }, ({ latitude, longitude }) => {
      return [latitude, longitude].filter(isDefined);
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
    .with({ type: "binPointsToGrid" }, ({ points }) => {
      return _getRequiredSourceColumnIds(points);
    })
    .with({ type: "bufferOfLayer" }, () => {
      return [];
    })
    .exhaustive();
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
    return createRebindRequired("missingBoundaryDataset", boundary.datasetId);
  }
  const geometryColumn = findBoundaryColumn(
    columns,
    dataset.id,
    boundary.geometryColumnId,
  );
  if (!geometryColumn) {
    return createRebindRequired(
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
  const keyColumn = findBoundaryColumn(
    options.columns,
    options.dataset.id,
    boundary.keyColumnId,
  );
  if (!keyColumn) {
    return createRebindRequired(
      "missingBoundaryKeyColumn",
      boundary.keyColumnId,
    );
  }
  const displayNameColumn = boundary.displayNameColumnId
    ? findBoundaryColumn(
        options.columns,
        options.dataset.id,
        boundary.displayNameColumnId,
      )
    : undefined;
  if (boundary.displayNameColumnId && !displayNameColumn) {
    return createRebindRequired(
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
  binding: AggregatingBinding,
): string | MapLayerMetadataResolution | undefined {
  const { aggregation } = binding;
  if (aggregation.operation === "count") {
    return undefined;
  }
  const queryColumn = layer.source.queryColumns.find(
    propEq("id", aggregation.measureColumn),
  );
  if (!queryColumn) {
    return createRebindRequired(
      "missingSourceColumn",
      aggregation.measureColumn,
    );
  }
  if (!QueryColumn.isNumeric(queryColumn)) {
    return createRebindRequired(
      "aggregationMeasureNotNumeric",
      queryColumn.baseColumn.id,
    );
  }
  return QueryColumn.getDerivedColumnName(queryColumn);
}

/** Resolves the optional denominator used by graduated symbology. */
function _getNormalizationDenominator(
  options: Readonly<ResolveOptions>,
  binding: AggregatingBinding | undefined,
): ResolvedDenominator | MapLayerRebindRequired | undefined {
  const { symbology } = options.layer;
  const color = "color" in symbology ? symbology.color : undefined;
  const normalization =
    color?.type === "graduated" ? color.normalization : undefined;
  if (!normalization) {
    return undefined;
  }
  const { denominator } = normalization;
  if (denominator.type === "queryColumn") {
    if (binding?.type === "aggregatePointsToBoundaries") {
      return createRebindRequired(
        "unsupportedNormalizationDenominator",
        denominator.column,
      );
    }
    const column = options.layer.source.queryColumns.find(
      propEq("id", denominator.column),
    );
    if (!column) {
      return createRebindRequired("missingSourceColumn", denominator.column);
    }
    if (!QueryColumn.isNumeric(column)) {
      return createRebindRequired(
        "normalizationDenominatorNotNumeric",
        denominator.column,
      );
    }
    return {
      type: "queryColumn",
      columnName: QueryColumn.getDerivedColumnName(column),
    };
  }
  const boundary =
    binding && "boundary" in binding ? binding.boundary : undefined;
  if (!boundary) {
    return createRebindRequired(
      "unsupportedNormalizationDenominator",
      denominator.column,
    );
  }
  const column = findBoundaryColumn(
    options.datasetColumns,
    boundary.datasetId,
    denominator.column,
  );
  if (!column) {
    return createRebindRequired(
      "missingBoundaryDenominatorColumn",
      denominator.column,
    );
  }
  const queryColumn = QueryColumn.makeFromDatasetColumn(column);
  if (!QueryColumn.isNumeric(queryColumn)) {
    return createRebindRequired(
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
    return createRebindRequired("missingSourceColumn", missingSourceColumnId);
  }
  const aggregatingBinding = _getAggregatingBinding(options.layer);
  const binding = _getBoundaryBinding(options.layer);
  const normalizationDenominator = _getNormalizationDenominator(
    options,
    aggregatingBinding,
  );
  if (
    normalizationDenominator &&
    normalizationDenominator.type === "rebindRequired"
  ) {
    return normalizationDenominator;
  }
  const disputedStatusColumn = getDisputedStatusColumn(options, binding);
  if (disputedStatusColumn && disputedStatusColumn.type === "rebindRequired") {
    return disputedStatusColumn;
  }
  const aggregationMeasure = aggregatingBinding
    ? _getAggregationMeasure(options.layer, aggregatingBinding)
    : undefined;
  if (typeof aggregationMeasure !== "string" && aggregationMeasure) {
    return aggregationMeasure;
  }
  if (!binding) {
    return {
      type: "resolved",
      sourceColumnNames,
      boundary: undefined,
      aggregationMeasureColumnName: aggregationMeasure,
      normalizationDenominator,
      disputedStatusColumn,
    };
  }
  const source = options.layer.source.dataSource;
  if (!Model.isOfModelType(source, "Dataset")) {
    return createRebindRequired(
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
  return {
    type: "resolved",
    sourceColumnNames,
    boundary,
    aggregationMeasureColumnName: aggregationMeasure,
    normalizationDenominator,
    disputedStatusColumn,
  };
}
