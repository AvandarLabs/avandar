import { isDefined, makeMap, makeSet, prop } from "@avandar/utils";
import { useMemo, useState } from "react";
import { createLayerGeometryCache } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import { makeMapSpecFromLayerSpecs } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeMapSpecFromLayerSpecs";
import { makeLayerRender } from "@/views/GisApp/layers/useAvaMapRender/makeLayerRender";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import type { LayerLegendUpdate } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** All map inputs derived from a complete layer stack. */
export type AvaMapRender = {
  spec: MapSpec;
  interactiveLayerIds: string[];
  layerViewStates: Map<MapLayer.Id, MapLayerViewState>;
  layerBounds: Map<MapLayer.Id, MapBounds | undefined>;
  legendUpdates: Map<MapLayer.Id, LayerLegendUpdate>;
};

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
    const cache = geometryCache;
    cache.prune(makeSet(mapConfig.layers, { key: "id" }));
    const renderedLayers = mapConfig.layers.map((layer) => {
      return makeLayerRender({
        layer,
        layerQueryStates,
        geometryCache: cache,
      });
    });

    return {
      spec: makeMapSpecFromLayerSpecs(
        renderedLayers.map(prop("layerSpec")).filter(isDefined),
      ),
      interactiveLayerIds: renderedLayers.flatMap(prop("interactiveLayerIds")),
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
    };
  }, [geometryCache, mapConfig.layers, layerQueryStates]);
}
