import { useLayerMapSpec } from "@/views/GisApp/layers/useLayerMapSpec";
import { useMapLayerData } from "@/views/GisApp/layers/useMapLayerData/useMapLayerData";
import type { LayerMapSpec } from "@/views/GisApp/layers/useLayerMapSpec";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Loads one map layer and derives the stable render state for its canvas. */
export function useGisLayerView({
  layer,
  workspaceId,
}: Readonly<{
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
}>): LayerMapSpec & { isLoading: boolean; error: Error | undefined } {
  const [queryResult, isLoading, { error }] = useMapLayerData({
    layer,
    workspaceId,
  });
  return {
    ...useLayerMapSpec({ layer, queryResult }),
    isLoading,
    error: error ?? undefined,
  };
}
