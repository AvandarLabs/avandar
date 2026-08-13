import { propEq } from "@avandar/utils";
import { useMemo } from "react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getBoundsFromFeatureCollection } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import { getLayerStatsFromFeatureCollection } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import { makeMapSpecFromLayerSpecs } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeMapSpecFromLayerSpecs";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { makeFeatureCollectionFromRows } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { GeometryDropReport } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
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
 * That matters because `MapLayer.toGeoBinding` builds a fresh object on
 * each call: memoizing on its result directly would miss on every render and
 * re-upload the whole GeoJSON source for unrelated state changes.
 *
 * The memoization here is load-bearing, not a render-count optimization. Each
 * value returned below is consumed by an effect dependency array in the canvas
 * (`useMapSpecSync`, `useFitMapBounds`, `useMapInstance`), so a fresh object
 * identity is not a wasted render, it is another `syncMap` pass that removes
 * and re-adds MapLibre layers and re-uploads the layer's whole GeoJSON on
 * every keystroke in the layer form. Keep every value that crosses into the
 * canvas referentially stable, and memoize on the narrowest inputs rather than
 * on a parent object that changes for unrelated reasons.
 *
 * `React.memo` is a separate question and is not what makes this work: none of
 * these memos depend on it, because their consumers are effects rather than
 * child components. Adding it to `MapCanvas` would not help either, since the
 * canvas takes `children` and would miss on every render.
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
    return MapLayer.toGeoBinding(layer);
    // Resolution reads only the binding and the query's columns, so a change
    // to symbology or legend must not invalidate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoBinding, queryColumns]);

  const { featureCollection, drops } = useMemo(() => {
    if (!resolvedBinding || !queryResult) {
      return { featureCollection: EMPTY_FEATURE_COLLECTION, drops: [] };
    }
    return makeFeatureCollectionFromRows({
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
    return makeMapSpecFromLayerSpecs([
      makeLayerSpecFromMapLayer({
        layer,
        featureCollection,
        stats: getLayerStatsFromFeatureCollection({ featureCollection, valueColumnName }),
        valueColumnName,
      }),
    ]);
  }, [layer, featureCollection, valueColumnName]);

  const fitBounds = useMemo(() => {
    return getBoundsFromFeatureCollection(featureCollection);
  }, [featureCollection]);

  const interactiveLayerIds = useMemo(() => {
    return [MapLayerIds.toLayerId(layerId)];
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
