import { FitBoundsRequest } from "@/views/GisApp/layers/FitBoundsRequest/FitBoundsRequest";
import { PersistedLayerLegends } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import { useMapLayerRendering } from "@/views/GisApp/layers/useMapLayerRendering";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayerRendering } from "@/views/GisApp/layers/useMapLayerRendering";
import type { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import type { GisAppChrome } from "@/views/GisApp/useGisApp/useGisAppChrome";

/** Loaded layer data plus the renderable map specification. */
export type GisAppRendering = MapLayerRendering;

/**
 * Loads layer data and derives the renderable map state from it, then does
 * what only the editor does: persists derived legends and fits new layers.
 */
export function useGisAppRendering(
  options: Readonly<{
    avaMap: AvaMap.T;
    chrome: GisAppChrome;
    editor: ReturnType<typeof useAvaMapEditor>;
    hiddenAnnotationFeatureIds?: readonly AvaMapConfig.AnnotationFeatureId[];
  }>,
): GisAppRendering {
  const rendering = useMapLayerRendering({
    mapConfig: options.editor.mapConfig,
    workspaceId: options.avaMap.workspaceId,
    view: options.editor.mapConfig.view,
    jitterSalt: options.avaMap.jitterSalt,
    hiddenAnnotationFeatureIds: options.hiddenAnnotationFeatureIds,
  });
  PersistedLayerLegends.usePersistedLayerLegends({
    mapConfig: options.editor.mapConfig,
    legendUpdates: rendering.legendUpdates,
    updateConfig: options.editor.updateConfig,
  });
  FitBoundsRequest.useAutoFitNewLayers({
    layerBounds: rendering.layerBounds,
    requestFitBounds: options.chrome.requestFitBounds,
  });
  return rendering;
}
