import { prop } from "@avandar/utils";
import { MapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

type Props = { app: GisAppState };

/** Displays the visible layers in the map legend. */
export function GisAppMapLegend({ app }: Props): ReactNode {
  return (
    <MapLegend
      layers={app.rows.filter(prop("isVisible"))}
      hasDrawnDisputedFeature={app.hasDrawnDisputedFeature}
      isCollapsed={app.panelState.legend}
      onToggleCollapsed={() => {
        app.togglePanel("legend");
      }}
    />
  );
}
