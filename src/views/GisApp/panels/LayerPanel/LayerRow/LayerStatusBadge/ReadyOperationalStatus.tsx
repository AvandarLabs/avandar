import { useLingui } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import { ReadyLayerStatus } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/ReadyLayerStatus";
import type { getMapLayerOperationalState } from "@/views/GisApp/layers/getMapLayerOperationalState/getMapLayerOperationalState";
import type { ReactNode } from "react";

type Props = {
  droppedRowCount: number;
  featureCount: number;
  operationalState: ReturnType<typeof getMapLayerOperationalState>;
};

/** Reports ready, suppressed, and no-data counts for a loaded layer. */
export function ReadyOperationalStatus({
  droppedRowCount,
  featureCount,
  operationalState,
}: Props): ReactNode {
  const { t } = useLingui();
  if (operationalState.type === "suppressed") {
    return (
      <Badge color="warning" variant="light" size="xs">
        {t`${operationalState.featureCount} suppressed`}
      </Badge>
    );
  }
  if (operationalState.type === "noData") {
    return (
      <Badge color="neutral" variant="light" size="xs">
        {t`${operationalState.featureCount} no data`}
      </Badge>
    );
  }
  return (
    <ReadyLayerStatus
      droppedRowCount={droppedRowCount}
      featureCount={featureCount}
    />
  );
}
