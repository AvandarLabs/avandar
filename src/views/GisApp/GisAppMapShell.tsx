import { useLingui } from "@lingui/react/macro";
import { GisAppFirstRunCard } from "@/views/GisApp/GisAppFirstRunCard";
import { GisAppFurnitureBar } from "@/views/GisApp/GisAppFurnitureBar";
import { GisAppLayerInspector } from "@/views/GisApp/GisAppLayerInspector";
import { GisAppLayerPanel } from "@/views/GisApp/GisAppLayerPanel";
import { GisAppMapLegend } from "@/views/GisApp/GisAppMapLegend";
import { GisAppStatusCard } from "@/views/GisApp/GisAppStatusCard";
import { GisAppTopBar } from "@/views/GisApp/GisAppTopBar";
import { MapCanvasSurface } from "@/views/GisApp/MapCanvas/MapCanvasSurface";
import { FeatureInspector } from "@/views/GisApp/panels/FeatureInspector/FeatureInspector";
import { MapShell } from "@/views/GisApp/shell/MapShell/MapShell";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import { useGisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
import type { GisAppState } from "@/views/GisApp/useGisApp";
import type { ReactNode } from "react";

type Props = { app: GisAppState };

/** Composes the application shell from independently focused GIS surfaces. */
export function GisAppMapShell({ app }: Props): ReactNode {
  const { t } = useLingui();
  const layerActions = useGisAppLayerActions(app);

  return (
    <>
      <MapShell
        mapLabel={t`Map of ${app.name}`}
        isChromeHidden={app.isChromeHidden}
        topBarRef={app.topBarRef}
        leftColumnRef={app.leftColumnRef}
        rightColumnRef={app.rightColumnRef}
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
        toolCluster={<MapToolCluster />}
        firstRunCard={
          <GisAppFirstRunCard
            app={app}
            onAddLayerFromSource={layerActions.onAddLayerFromSource}
          />
        }
        furnitureBar={<GisAppFurnitureBar app={app} />}
      />
      <FeatureInspector
        opened={app.isInspectorOpen}
        onClose={app.closeInspector}
        feature={app.selectedFeature}
        popup={app.selectedLayer?.popup}
      />
    </>
  );
}
