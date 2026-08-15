import { LayerPanel } from "@/views/GisApp/panels/LayerPanel/LayerPanel";
import type { GisAppState } from "@/views/GisApp/useGisApp";
import type { GisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
import type { ReactNode } from "react";

type Props = { app: GisAppState; actions: GisAppLayerActions };

/** Renders the layer stack with actions that update the editable map config. */
export function GisAppLayerPanel({ app, actions }: Props): ReactNode {
  return (
    <LayerPanel
      rows={app.rows}
      viewStates={app.layerViewStates}
      selectedLayerId={app.selectedLayerId}
      isCollapsed={app.panelState.layers}
      onToggleCollapsed={() => {
        app.togglePanel("layers");
      }}
      {...actions}
      onSelectLayer={app.setSelectedLayerId}
    />
  );
}
