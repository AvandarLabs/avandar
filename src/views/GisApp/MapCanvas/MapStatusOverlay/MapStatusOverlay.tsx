import { DroppedRowsAlert } from "@/views/GisApp/MapCanvas/MapStatusOverlay/DroppedRowsAlert";
import { MapEmptyStatus } from "@/views/GisApp/MapCanvas/MapStatusOverlay/MapEmptyStatus";
import { MapErrorStatus } from "@/views/GisApp/MapCanvas/MapStatusOverlay/MapErrorStatus";
import { MapLoadingStatus } from "@/views/GisApp/MapCanvas/MapStatusOverlay/MapLoadingStatus";
import { MapUnconfiguredStatus } from "@/views/GisApp/MapCanvas/MapStatusOverlay/MapUnconfiguredStatus";
import { StatusShell } from "@/views/GisApp/MapCanvas/MapStatusOverlay/StatusShell/StatusShell";
import type { GeometryDropReport } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { ReactNode } from "react";

type Props = {
  isLoading: boolean;
  error: Error | undefined;
  hasBinding: boolean;
  featureCount: number;
  drops: readonly GeometryDropReport[];
};

/**
 * Reports what the map is doing when it is not simply showing data: loading,
 * failed, unconfigured, empty, or silently dropping rows.
 */
export function MapStatusOverlay({
  isLoading,
  error,
  hasBinding,
  featureCount,
  drops,
}: Props): ReactNode {
  const droppedRowCount = drops.reduce((total, drop) => {
    return total + drop.count;
  }, 0);

  if (error) {
    return <MapErrorStatus error={error} />;
  }
  if (isLoading) {
    return <MapLoadingStatus />;
  }
  if (!hasBinding) {
    return <MapUnconfiguredStatus />;
  }
  if (droppedRowCount > 0) {
    return (
      <StatusShell>
        <DroppedRowsAlert
          featureCount={featureCount}
          droppedRowCount={droppedRowCount}
        />
      </StatusShell>
    );
  }
  if (featureCount === 0) {
    return <MapEmptyStatus />;
  }
  return null;
}
