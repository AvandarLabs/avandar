import { Model } from "@avandar/models";
import { VirtualPlacesStore as PlacesStore } from "@/clients/places/VirtualPlacesStore/VirtualPlacesStore";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Whether a layer reads one of the current workspace's places datasets. */
export function useIsPlacesLayer(layer: MapLayer.T): boolean {
  const workspace = useCurrentWorkspace();
  const placesDatasetIds = PlacesStore.usePlacesDatasetIds(workspace.id);
  const dataSource = layer.source.dataSource;
  return (
    dataSource !== undefined &&
    Model.isOfModelType(dataSource, "Dataset") &&
    placesDatasetIds.has(dataSource.id)
  );
}
