import { ClearAoiButton } from "@/views/GisApp/shell/ClearAoiButton/ClearAoiButton";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

/** Map-tool cluster, AOI clear control, and invalid-ring status. */
export function GisAppMapToolCluster({
  app,
  placeTool,
}: {
  app: GisAppState;
  placeTool: PlaceToolController;
}): ReactNode {
  return (
    <>
      <ClearAoiButton aoi={app.mapConfig.aoi} updateConfig={app.updateConfig} />
      {app.invalidRingStatus ? (
        <div role="status">{app.invalidRingStatus}</div>
      ) : null}
      <MapToolCluster
        mapToolMode={app.mapToolMode}
        onMapToolModeChange={app.setMapToolMode}
        selectedLayer={app.selectedLayer}
        updateConfig={app.updateConfig}
        measureVertices={app.measureVertices}
        layers={app.mapConfig.layers}
        featureCollections={app.layerFeatureCollections}
        requestFitBounds={app.requestFitBounds}
        placeTool={placeTool}
      />
    </>
  );
}
