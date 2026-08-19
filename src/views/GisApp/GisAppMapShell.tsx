import { useLingui } from "@lingui/react/macro";
import { useRef } from "react";
import { GisAppFirstRunCard } from "@/views/GisApp/GisAppFirstRunCard";
import { GisAppFurnitureBar } from "@/views/GisApp/GisAppFurnitureBar";
import { GisAppLayerInspector } from "@/views/GisApp/GisAppLayerInspector/GisAppLayerInspector";
import { GisAppLayerPanel } from "@/views/GisApp/GisAppLayerPanel";
import { GisAppMapLegend } from "@/views/GisApp/GisAppMapLegend";
import { GisAppMapToolCluster } from "@/views/GisApp/GisAppMapToolCluster";
import { GisAppStatusCard } from "@/views/GisApp/GisAppStatusCard";
import { GisAppTopBar } from "@/views/GisApp/GisAppTopBar";
import { MapCanvasSurface } from "@/views/GisApp/MapCanvas/MapCanvasSurface/MapCanvasSurface";
import { FeatureInspector } from "@/views/GisApp/panels/FeatureInspector/FeatureInspector";
import { MapShell } from "@/views/GisApp/shell/MapShell/MapShell";
import { MapTimeSlider } from "@/views/GisApp/shell/MapTimeSlider/MapTimeSlider";
import { useGisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

type Props = { app: GisAppState };

/** Composes the application shell from independently focused GIS surfaces. */
export function GisAppMapShell({ app }: Props): ReactNode {
  const { t } = useLingui();
  const layerActions = useGisAppLayerActions(app);
  const mapSurfaceRef = useRef<HTMLDivElement>(null);

  return (
    <MapShell
      mapLabel={t`Map of ${app.name}`}
      isChromeHidden={app.isChromeHidden}
      topBarRef={app.topBarRef}
      leftColumnRef={app.leftColumnRef}
      rightColumnRef={app.rightColumnRef}
      canvasSurfaceRef={mapSurfaceRef}
      canvas={<MapCanvasSurface containerRef={app.containerRef} />}
      topBar={<GisAppTopBar app={app} />}
      layerPanel={<GisAppLayerPanel app={app} actions={layerActions} />}
      inspector={
        <GisAppLayerInspector
          app={app}
          updateSelectedLayer={layerActions.updateSelectedLayer}
        />
      }
      legend={<GisAppMapLegend app={app} />}
      statusCard={<GisAppStatusCard app={app} />}
      timeSlider={
        <MapTimeSlider
          layers={app.mapConfig.layers}
          timeRange={app.mapConfig.timeRange}
          updateConfig={app.updateConfig}
          workspaceId={app.avaMap.workspaceId}
        />
      }
      toolCluster={<GisAppMapToolCluster app={app} />}
      firstRunCard={
        <GisAppFirstRunCard
          app={app}
          onAddLayerFromSource={layerActions.onAddLayerFromSource}
        />
      }
      furnitureBar={<GisAppFurnitureBar app={app} />}
      featureDrawer={
        <FeatureInspector
          opened={app.isInspectorOpen}
          onClose={app.closeInspector}
          feature={app.selectedFeature}
          popup={app.selectedLayer?.popup}
          canvasRef={mapSurfaceRef}
        />
      }
    />
  );
}
