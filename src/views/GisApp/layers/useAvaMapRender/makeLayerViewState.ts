import { noop, sortObjList } from "@avandar/utils";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import type { LayerGeometry } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import type {
  DropReason,
  GeometryDropReport,
} from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

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
function _getDroppedRowCount(drops: readonly GeometryDropReport[]): number {
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
  return (
    !hasBinding ? "unbound"
    : error ? "error"
    : isLoading ? "loading"
    : featureCount === 0 && droppedRowCount === 0 ? "empty"
    : "ready"
  );
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

/** Builds the status consumed by the layer list and selected-layer controls. */
export function makeLayerViewState({
  layer,
  hasBinding,
  geometry,
  queryState,
}: MakeLayerViewStateInput): MapLayerViewState {
  const droppedRowCount = _getDroppedRowCount(geometry.drops);
  const error = queryState?.error ?? geometry.error;
  return {
    status: _getLayerStatus({
      hasBinding,
      error,
      isLoading: queryState?.isLoading,
      featureCount: geometry.featureCollection.features.length,
      droppedRowCount,
    }),
    error,
    featureCount: geometry.featureCollection.features.length,
    droppedRowCount,
    drops: geometry.drops,
    largestDropReason: _getLargestDropReason(geometry.drops),
    spatialDiagnostics:
      queryState?.data?.type === "spatial" ?
        queryState.data.diagnostics
      : undefined,
    ..._getAggregateFeatureCounts(geometry.featureCollection),
    filterCount: layer.source.filters.rules.length,
    onRetry: queryState?.refetch ?? noop,
  };
}
