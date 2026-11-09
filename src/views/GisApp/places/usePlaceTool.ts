import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { VirtualPlacesStore as PlacesStore } from "@/clients/places/VirtualPlacesStore/VirtualPlacesStore";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { getPlacesLayerDatasetIds } from "@/views/GisApp/places/getPlacesLayerDatasetIds/getPlacesLayerDatasetIds";
import { usePlacesActions } from "@/views/GisApp/places/usePlacesActions";
import { useRefreshPlacesOnMapOpen } from "@/views/GisApp/places/useRefreshPlacesOnMapOpen";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { GeocodeBiasBox } from "@sbfn/geocode/GeocoderProvider.types";

function _clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/** The current map view as a geocoder bias box, clamped to WGS 84 bounds. */
function _getBiasBox(app: GisAppState): GeocodeBiasBox | undefined {
  const bounds = app.mapInstance.mapRef.current?.getBounds();
  if (!bounds) {
    return undefined;
  }
  return {
    west: _clamp(bounds.getWest(), 180),
    south: _clamp(bounds.getSouth(), 90),
    east: _clamp(bounds.getEast(), 180),
    north: _clamp(bounds.getNorth(), 90),
  };
}

function _toDatasetOptions(
  datasets: readonly Dataset.T[],
  placesDatasetIds: ReadonlySet<Dataset.Id>,
): Array<{ value: Dataset.Id; label: string }> {
  return datasets
    .filter((dataset) => {
      return placesDatasetIds.has(dataset.id);
    })
    .map((dataset) => {
      return { value: dataset.id, label: dataset.name };
    });
}

/**
 * Builds the "Add a place" tool's controller from the GIS app state: which
 * places datasets exist and which one this map saves to, plus every write.
 * Called once by `GisAppMapShell`, which hands it to the tool cluster and the
 * feature inspector.
 */
export function usePlaceTool(app: GisAppState): PlaceToolController {
  const workspaceId = app.avaMap.workspaceId;
  const user = useCurrentUser();
  const placesDatasetIds = PlacesStore.usePlacesDatasetIds(workspaceId);
  const [datasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const [datasetColumns = []] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const placesLayerDatasetIds = useMemo(() => {
    return getPlacesLayerDatasetIds({
      layers: app.mapConfig.layers,
      placesDatasetIds,
    });
  }, [app.mapConfig.layers, placesDatasetIds]);
  const targetDatasetId = placesLayerDatasetIds[0];
  const actions = usePlacesActions({
    app,
    datasets,
    datasetColumns,
    placesDatasetIds,
    targetDatasetId,
  });
  useRefreshPlacesOnMapOpen({
    placesLayerDatasetIds,
    userId: user?.id as User.Id | undefined,
    workspaceId,
  });
  return {
    ...actions,
    state: app.placeToolState,
    isArmed: app.mapToolMode.type === "place",
    targetDatasetId,
    placesDatasetOptions: _toDatasetOptions(datasets, placesDatasetIds),
    getBiasBox: () => {
      return _getBiasBox(app);
    },
    armMapPick: () => {
      app.setMapToolMode({ type: "place" });
    },
  };
}
