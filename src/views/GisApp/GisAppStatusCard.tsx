import { MapStatusCard } from "@/views/GisApp/panels/MapStatusCard/MapStatusCard";
import type { GisAppState } from "@/views/GisApp/useGisApp";
import type { ReactNode } from "react";

type Props = { app: GisAppState };

/** Displays the status card for the layer selected in the layer panel. */
export function GisAppStatusCard({ app }: Props): ReactNode {
  return (
    <MapStatusCard
      layer={app.selectedLayer}
      viewState={
        app.selectedLayerId ?
          app.layerViewStates.get(app.selectedLayerId)
        : undefined
      }
      onSeeWhy={() => {
        app.onInspectorViewChange({ type: "validationReport" });
      }}
      onReviewFilter={app.onReviewFilter}
    />
  );
}
