import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { useRef, useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ExportSheet } from "@/views/GisApp/export/ExportSheet/ExportSheet";
import { getExportLegendEntries } from "@/views/GisApp/export/getExportLegendEntries/getExportLegendEntries";
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
import { AnnotationTextOverlay } from "@/views/GisApp/shell/AnnotationTextOverlay/AnnotationTextOverlay";
import { MapShell } from "@/views/GisApp/shell/MapShell/MapShell";
import { MapTimeSlider } from "@/views/GisApp/shell/MapTimeSlider/MapTimeSlider";
import { useBasemapAttribution } from "@/views/GisApp/useBasemapAttribution";
import { useGisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

type Props = { app: GisAppState };

function _replaceAnnotationFeature(
  app: GisAppState,
  nextFeature: AvaMapConfig.AnnotationFeature,
): void {
  app.updateConfig((current) => {
    return {
      ...current,
      annotations: {
        ...current.annotations,
        features: current.annotations.features.map((item) => {
          return item.id === nextFeature.id ? nextFeature : item;
        }),
      },
    };
  });
}

function GisAppAnnotationTextOverlay({ app }: Readonly<Props>): ReactNode {
  const map = app.mapInstance.mapRef.current;
  const target = app.annotationTextOverlayTarget;
  if (!map || !target) {
    return null;
  }
  const feature = target.feature;
  if (target.mode === "edit") {
    return (
      <AnnotationTextOverlay
        map={map}
        feature={feature}
        onTextChange={(text) => {
          _replaceAnnotationFeature(app, { ...feature, text });
        }}
        onCommit={() => {
          app.setEditingTextFeatureId(undefined);
        }}
      />
    );
  }
  return (
    <AnnotationTextOverlay
      map={map}
      feature={feature}
      mode="select"
      onMove={(coordinates) => {
        _replaceAnnotationFeature(app, {
          ...feature,
          geometry: { type: "Point", coordinates },
        });
      }}
      onResize={(sizePx) => {
        _replaceAnnotationFeature(app, { ...feature, sizePx });
      }}
      onStartEdit={() => {
        app.setEditingTextFeatureId(feature.id);
      }}
    />
  );
}

/** Composes the application shell from independently focused GIS surfaces. */
export function GisAppMapShell({ app }: Props): ReactNode {
  const { t } = useLingui();
  const layerActions = useGisAppLayerActions(app);
  const mapSurfaceRef = useRef<HTMLDivElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const workspace = useCurrentWorkspace();
  const basemapAttribution = useBasemapAttribution(app.mapConfig.basemap);

  return (
    <MapShell
      mapLabel={t`Map of ${app.name}`}
      isChromeHidden={app.isChromeHidden}
      topBarRef={app.topBarRef}
      leftColumnRef={app.leftColumnRef}
      rightColumnRef={app.rightColumnRef}
      canvasSurfaceRef={mapSurfaceRef}
      canvas={
        <>
          <MapCanvasSurface containerRef={app.containerRef} />
          <GisAppAnnotationTextOverlay app={app} />
        </>
      }
      topBar={
        <GisAppTopBar
          app={app}
          onOpenExport={() => {
            setIsExportOpen(true);
          }}
        />
      }
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
        <>
          <FeatureInspector
            opened={app.isInspectorOpen}
            onClose={app.closeInspector}
            feature={app.selectedFeature}
            cluster={app.selectedCluster}
            layer={app.selectedLayer}
            canvasRef={mapSurfaceRef}
            mapRef={app.mapInstance.mapRef}
            onRowClick={app.onRowClick}
            onBackToTable={app.onBackToTable}
          />
          <ExportSheet
            opened={isExportOpen}
            onClose={() => {
              setIsExportOpen(false);
            }}
            config={app.mapConfig}
            mapName={app.name}
            workspaceName={workspace.name}
            basemapAttribution={basemapAttribution}
            spec={app.spec}
            view={app.mapConfig.view}
            legendEntries={getExportLegendEntries({
              layers: app.rows.filter(prop("isVisible")),
              labels: { heatmapLowLabel: t`Low`, heatmapHighLabel: t`High` },
            })}
            hasDrawnDisputedFeature={app.hasDrawnDisputedFeature}
            onConfigChange={app.updateConfig}
          />
        </>
      }
    />
  );
}
