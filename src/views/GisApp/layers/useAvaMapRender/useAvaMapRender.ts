import { isDefined, makeMap, makeSet, prop } from "@avandar/utils";
import { useMemo, useState } from "react";
import { createLayerGeometryCache } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import { makeMapSpecFromAnnotations } from "@/views/GisApp/layers/makeMapSpecFromAnnotations/makeMapSpecFromAnnotations";
import { makeMapSpecFromLayerSpecs } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeMapSpecFromLayerSpecs";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { makeLayerRender } from "@/views/GisApp/layers/useAvaMapRender/makeLayerRender";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { LayerLegendUpdate } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** All map inputs derived from a complete layer stack. */
export type AvaMapRender = {
  spec: MapSpec;
  interactiveLayerIds: string[];
  layerViewStates: Map<MapLayer.Id, MapLayerViewState>;
  layerBounds: Map<MapLayer.Id, MapBounds | undefined>;
  legendUpdates: Map<MapLayer.Id, LayerLegendUpdate>;
  /** True when any visible layer draws a disputed or undetermined boundary. */
  hasDrawnDisputedFeature: boolean;
};

/** Hit-testable annotation layer ids, empty when the overlay is hidden. */
function _getAnnotationInteractiveLayerIds(
  annotations: AvaMapConfig.AnnotationLayer,
): string[] {
  if (!annotations.isVisible) {
    return [];
  }
  return [
    MapLayerIds.annotationFillLayer,
    MapLayerIds.annotationLineLayer,
    MapLayerIds.annotationSymbolLayer,
  ];
}

/** Merges data-layer specs around the annotation overlay at `zIndex`. */
function _makeStackedMapSpec(options: {
  layerSpecs: ReadonlyArray<MapSpec | undefined>;
  annotationSpec: MapSpec;
  annotationsZIndex: number;
}): MapSpec {
  const { layerSpecs, annotationSpec, annotationsZIndex } = options;
  return makeMapSpecFromLayerSpecs([
    ...layerSpecs.slice(0, annotationsZIndex).filter(isDefined),
    annotationSpec,
    ...layerSpecs.slice(annotationsZIndex).filter(isDefined),
  ]);
}

function _makeAvaMapRender(options: {
  mapConfig: AvaMapConfig.T;
  layerQueryStates: ReadonlyMap<MapLayer.Id, MapLayerQueryState>;
  geometryCache: ReturnType<typeof createLayerGeometryCache>;
}): AvaMapRender {
  const { mapConfig, layerQueryStates, geometryCache } = options;
  geometryCache.prune(makeSet(mapConfig.layers, { key: "id" }));
  const renderedLayers = mapConfig.layers.map((layer) => {
    return makeLayerRender({
      layer,
      layerQueryStates,
      geometryCache,
    });
  });
  return {
    spec: _makeStackedMapSpec({
      layerSpecs: renderedLayers.map(prop("layerSpec")),
      annotationSpec: makeMapSpecFromAnnotations({
        annotations: mapConfig.annotations,
      }),
      annotationsZIndex: mapConfig.annotationsZIndex,
    }),
    interactiveLayerIds: [
      ...renderedLayers.flatMap(prop("interactiveLayerIds")),
      ..._getAnnotationInteractiveLayerIds(mapConfig.annotations),
    ],
    layerViewStates: makeMap(renderedLayers, {
      key: "layerId",
      valueKey: "viewState",
    }),
    layerBounds: makeMap(renderedLayers, {
      key: "layerId",
      valueKey: "bounds",
    }),
    legendUpdates: makeMap(
      renderedLayers.filter(({ legendUpdate }) => {
        return legendUpdate !== undefined;
      }),
      { key: "layerId", valueKey: "legendUpdate" },
    ) as Map<MapLayer.Id, LayerLegendUpdate>,
    hasDrawnDisputedFeature: renderedLayers.some(
      prop("hasDrawnDisputedFeature"),
    ),
  };
}

/** Derives rendering, interaction, status, and bounds for all map layers. */
export function useAvaMapRender({
  mapConfig,
  layerQueryStates,
}: Readonly<{
  mapConfig: AvaMapConfig.T;
  layerQueryStates: ReadonlyMap<MapLayer.Id, MapLayerQueryState>;
}>): AvaMapRender {
  const [geometryCache] = useState(createLayerGeometryCache);

  return useMemo(() => {
    return _makeAvaMapRender({
      mapConfig,
      layerQueryStates,
      geometryCache,
    });
  }, [geometryCache, layerQueryStates, mapConfig]);
}
