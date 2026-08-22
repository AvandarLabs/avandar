import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

import { MapPartialMappingStatus } from "@/views/GisApp/panels/MapStatusCard/MapPartialMappingStatus";

type Props = {
  viewState: MapLayerViewState;
  hasPartialMapping: boolean;
  totalRowCount: number;
  i18n: I18n;
  onSeeWhy: () => void;
};

/** Renders the ready-state partial-mapping warning when rows were dropped. */
export function MapReadyPartialStatus({
  viewState,
  hasPartialMapping,
  totalRowCount,
  i18n,
  onSeeWhy,
}: Props): ReactNode {
  if (!hasPartialMapping) {
    return null;
  }
  return (
    <MapPartialMappingStatus
      droppedRowCount={viewState.droppedRowCount}
      totalRowCount={totalRowCount}
      largestDropReason={viewState.largestDropReason}
      i18n={i18n}
      onSeeWhy={onSeeWhy}
    />
  );
}
