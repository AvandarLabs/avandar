import { prop } from "@avandar/utils";
import { MapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend";
import { useLegendCollapse } from "@/views/GisApp/panels/LegendPanel/useLegendCollapse/useLegendCollapse";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

type Props = { app: GisAppState };

/**
 * Displays the visible layers in the map legend, collapsed while a feature
 * list is open.
 */
export function GisAppMapLegend({ app }: Props): ReactNode {
  const { isCollapsed, onToggleCollapsed } = useLegendCollapse({
    isPanelCollapsed: app.panelState.legend,
    onTogglePanel: () => {
      app.togglePanel("legend");
    },
    openFeatureListLayerId: app.mapConfig.layers.some((layer) => {
      return layer.id === app.featureListLayerId;
    })
      ? app.featureListLayerId
      : undefined,
  });
  return (
    <MapLegend
      layers={app.rows.filter(prop("isVisible"))}
      hasDrawnDisputedFeature={app.hasDrawnDisputedFeature}
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
    />
  );
}
