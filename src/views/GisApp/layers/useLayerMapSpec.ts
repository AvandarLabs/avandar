import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { useMemo } from "react";
import { getBoundsFromFeatureCollection } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { useLayerFeatureCollection } from "@/views/GisApp/layers/useLayerFeatureCollection";
import { useRenderedLayerSpec } from "@/views/GisApp/layers/useRenderedLayerSpec";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { GeometryDropReport } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

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
  queryResult: QueryResult.T<UnknownRow> | undefined;
}): LayerMapSpec {
  const { geoBinding, id: layerId, sensitivity } = layer;
  const { queryColumns } = layer.source;

  const boundColumns = useMemo(() => {
    return MapLayer.toGeoBinding(layer);
    // Resolution reads only the binding and the query's columns, so a change
    // to symbology or legend must not invalidate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoBinding, queryColumns]);

  const { featureCollection, drops } = useLayerFeatureCollection({
    binding: boundColumns,
    queryResult,
    sensitivity,
    layerId,
  });
  const spec = useRenderedLayerSpec({ layer, featureCollection });

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
    hasBinding: boundColumns !== undefined,
    drops,
  };
}
