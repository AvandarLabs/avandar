import { propEq } from "@avandar/utils";
import { useMemo } from "react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { computeBounds } from "@/views/GisApp/layers/computeBounds/computeBounds";
import { computeLayerStats } from "@/views/GisApp/layers/computeLayerStats/computeLayerStats";
import { createMapSpec } from "@/views/GisApp/layers/createMapSpec/createMapSpec";
import { createLayerSpec } from "@/views/GisApp/layers/createMapSpec/createLayerSpec/createLayerSpec";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { toFeatureCollection } from "@/views/GisApp/layers/toFeatureCollection/toFeatureCollection";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapBounds } from "@/views/GisApp/layers/computeBounds/computeBounds";
import type { MapSpec } from "@/views/GisApp/layers/createMapSpec/MapSpec.types";
import type { GeometryDropReport } from "@/views/GisApp/layers/toFeatureCollection/toFeatureCollection";
// The QueryResult namespace entry publishes a non-generic `T`, so the row type
// can only be expressed through the underlying generic in the types module.
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/** Everything the canvas and the status overlay need for one layer. */
export type LayerMapSpec = {
  spec: MapSpec;
  fitBounds: MapBounds | undefined;
  interactiveLayerIds: readonly string[];
  featureCount: number;
  hasBinding: boolean;
  drops: readonly GeometryDropReport[];
};

/**
 * Turns a layer plus its query rows into the declarative spec the canvas
 * renders.
 *
 * Every step is memoized on the narrowest inputs that actually affect it.
 * That matters because `MapLayer.resolveGeoBinding` builds a fresh object on
 * each call: memoizing on its result directly would miss on every render and
 * re-upload the whole GeoJSON source for unrelated state changes.
 */
export function useLayerMapSpec({
  layer,
  queryResult,
}: {
  layer: MapLayer.T;
  queryResult: QueryResult<UnknownRow> | undefined;
}): LayerMapSpec {
  const { geoBinding, symbology, id: layerId, sensitivity } = layer;
  const { queryColumns } = layer.source;

  const resolvedBinding = useMemo(() => {
    return MapLayer.resolveGeoBinding(layer);
    // Resolution reads only the binding and the query's columns, so a change
    // to symbology or legend must not invalidate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoBinding, queryColumns]);

  const { featureCollection, drops } = useMemo(() => {
    if (!resolvedBinding || !queryResult) {
      return { featureCollection: EMPTY_FEATURE_COLLECTION, drops: [] };
    }
    return toFeatureCollection({
      rows: queryResult.data,
      binding: resolvedBinding,
      sensitivity,
      layerId,
    });
  }, [resolvedBinding, queryResult, sensitivity, layerId]);

  const valueColumn =
    symbology.type === "proportionalSymbol" ?
      queryColumns.find(propEq("id", symbology.value))
    : undefined;
  const valueColumnName =
    valueColumn ? QueryColumn.getDerivedColumnName(valueColumn) : undefined;

  const spec = useMemo(() => {
    return createMapSpec([
      createLayerSpec({
        layer,
        featureCollection,
        stats: computeLayerStats({ featureCollection, valueColumnName }),
        valueColumnName,
      }),
    ]);
  }, [layer, featureCollection, valueColumnName]);

  const fitBounds = useMemo(() => {
    return computeBounds(featureCollection);
  }, [featureCollection]);

  const interactiveLayerIds = useMemo(() => {
    return [MapLayerIds.buildLayerId(layerId)];
  }, [layerId]);

  return {
    spec,
    fitBounds,
    interactiveLayerIds,
    featureCount: featureCollection.features.length,
    hasBinding: resolvedBinding !== undefined,
    drops,
  };
}
