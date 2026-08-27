import { noop, sortObjList } from "@avandar/utils";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type {
  PointAggregation,
  PointCoordinateAudit,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.types";
import type { LayerGeometry } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import type {
  DropReason,
  GeometryDropReport,
} from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

type GetLayerStatusInput = {
  hasBinding: boolean;
  error: Error | undefined;
  isLoading: boolean | undefined;
  featureCount: number;
  droppedRowCount: number;
};

type MakeLayerViewStateInput = {
  layer: MapLayer.T;
  hasBinding: boolean;
  geometry: LayerGeometry;
  queryState: MapLayerQueryState | undefined;

  /** Row counts DuckDB measured, for a lat/lng point layer. */
  audit?: PointCoordinateAudit;

  /** Set when the geometry is aggregated cells rather than source rows. */
  aggregation?: PointAggregation;
};

/** The largest single drop reason, or `undefined` when nothing was dropped. */
function _getLargestDropReason(
  drops: readonly GeometryDropReport[],
): DropReason | undefined {
  return sortObjList(drops, {
    sortBy: (drop) => {
      return drop.count;
    },
    comparator: (firstCount, secondCount) => {
      return secondCount - firstCount;
    },
  })[0]?.reason;
}

/** Counts source rows that could not become geometry. */
function _getDroppedRowCount(
  drops: ReadonlyArray<Pick<GeometryDropReport, "count">>,
): number {
  return drops.reduce((total, drop) => {
    return total + drop.count;
  }, 0);
}

/** Chooses the data-health status presented for one layer. */
function _getLayerStatus({
  hasBinding,
  error,
  isLoading,
  featureCount,
  droppedRowCount,
}: GetLayerStatusInput): MapLayerViewState["status"] {
  return !hasBinding
    ? "unbound"
    : error
      ? "error"
      : isLoading
        ? "loading"
        : featureCount === 0 && droppedRowCount === 0
          ? "empty"
          : "ready";
}

/** Counts aggregate feature states without exposing suppressed metrics. */
function _getAggregateFeatureCounts(
  featureCollection: GeoJSON.FeatureCollection,
): Pick<
  MapLayerViewState,
  "contributorCount" | "noDataCount" | "suppressedCount"
> {
  let contributorCount = 0;
  let noDataCount = 0;
  let suppressedCount = 0;
  featureCollection.features.forEach(({ properties }) => {
    const state = properties?.[MapLayerSpatialFeatureProperties.state];
    if (state === "noData") {
      noDataCount += 1;
    } else if (state === "suppressed") {
      suppressedCount += 1;
    }
    const featureContributorCount =
      properties?.[MapLayerSpatialFeatureProperties.contributorCount];
    if (typeof featureContributorCount === "number") {
      contributorCount += featureContributorCount;
    }
  });
  return { contributorCount, noDataCount, suppressedCount };
}

/**
 * The counts the layer reports as mapped and dropped.
 *
 * An aggregated layer's features are cells, not rows, so counting features
 * would claim a few thousand rows for a dataset of millions. The counts DuckDB
 * measured before aggregating are used instead, which is the only way the
 * status can describe the source rather than the render.
 */
function _getRowCounts(options: MakeLayerViewStateInput): {
  featureCount: number;
  droppedRowCount: number;
  drops: readonly GeometryDropReport[];
} {
  const { audit, aggregation, geometry } = options;
  if (aggregation !== undefined && audit !== undefined) {
    return {
      featureCount: aggregation.aggregatedRowCount,
      droppedRowCount: _getDroppedRowCount(audit.drops),
      drops: audit.drops.map((drop) => {
        return { ...drop, sampleRowIndexes: [] };
      }),
    };
  }
  return {
    featureCount: geometry.featureCollection.features.length,
    droppedRowCount: _getDroppedRowCount(geometry.drops),
    drops: geometry.drops,
  };
}

/** Builds the status consumed by the layer list and selected-layer controls. */
export function makeLayerViewState(
  input: MakeLayerViewStateInput,
): MapLayerViewState {
  const { layer, hasBinding, geometry, queryState } = input;
  const { featureCount, droppedRowCount, drops } = _getRowCounts(input);
  const error = queryState?.error ?? geometry.error;
  return {
    status: _getLayerStatus({
      hasBinding,
      error,
      isLoading: queryState?.isLoading,
      featureCount,
      droppedRowCount,
    }),
    error,
    featureCount,
    droppedRowCount,
    drops: [...drops],
    largestDropReason: _getLargestDropReason(drops),
    spatialDiagnostics:
      queryState?.data?.type === "spatial"
        ? queryState.data.diagnostics
        : undefined,
    ..._getAggregateFeatureCounts(geometry.featureCollection),
    filterCount: layer.source.filters.rules.length,
    onRetry: queryState?.refetch ?? noop,
  };
}
