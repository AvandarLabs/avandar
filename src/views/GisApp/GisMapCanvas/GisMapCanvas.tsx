import { Box } from "@mantine/core";
import css from "@/views/GisApp/GisMapCanvas/GisMapCanvas.module.css";
import { MapCanvas } from "@/views/GisApp/MapCanvas/MapCanvas";
import { MapStatusOverlay } from "@/views/GisApp/MapCanvas/MapStatusOverlay/MapStatusOverlay";
import { LayerFormPanel } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel";
import { useGisLayerView } from "@/views/GisApp/useGisLayerView";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

type Props = {
  avaMap: AvaMap.T;
  layer: MapLayer.T;
  onBasemapChange: (basemap: AvaMap.Basemap) => void;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  onLayerChange: (update: (current: MapLayer.T) => MapLayer.T) => void;
  workspaceId: Workspace.Id;
};

/** Renders the active layer, its controls, and its current data status. */
export function GisMapCanvas({
  avaMap,
  layer,
  onBasemapChange,
  onFeatureClick,
  onLayerChange,
  workspaceId,
}: Readonly<Props>): ReactNode {
  const layerView = useGisLayerView({ layer, workspaceId });
  return (
    <MapCanvas
      basemap={avaMap.basemap}
      view={avaMap.view}
      spec={layerView.spec}
      fitBounds={layerView.fitBounds}
      interactiveLayerIds={layerView.interactiveLayerIds}
      onFeatureClick={onFeatureClick}
    >
      <Box className={css.gisMapCanvasControlPanel}>
        <LayerFormPanel
          layer={layer}
          basemap={avaMap.basemap}
          onLayerChange={onLayerChange}
          onBasemapChange={onBasemapChange}
        />
      </Box>
      <MapStatusOverlay
        isLoading={layerView.isLoading}
        error={layerView.error}
        hasBinding={layerView.hasBinding}
        featureCount={layerView.featureCount}
        drops={layerView.drops}
      />
    </MapCanvas>
  );
}
