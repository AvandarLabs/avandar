import { VirtualPlacesStore as PlacesStore } from "@/clients/places/VirtualPlacesStore/VirtualPlacesStore";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getPlacesLayerDatasetId } from "@/views/GisApp/places/getPlacesLayerDatasetId/getPlacesLayerDatasetId";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Whether a layer reads one of the current workspace's places datasets. */
export function useIsPlacesLayer(layer: MapLayer.T): boolean {
  const workspace = useCurrentWorkspace();
  const placesDatasetIds = PlacesStore.usePlacesDatasetIds(workspace.id);
  return getPlacesLayerDatasetId(layer, placesDatasetIds) !== undefined;
}
