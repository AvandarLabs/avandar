import { useLingui } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import { getMapLayerOperationalState } from "@/views/GisApp/layers/getMapLayerOperationalState/getMapLayerOperationalState";
import { LayerLoadStatus } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/LayerLoadStatus";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

type Props = { viewState: MapLayerViewState };

/** Reports the current data health inline on a layer row. */
export function LayerStatusBadge({ viewState }: Props): ReactNode {
  const { t } = useLingui();
  const operationalState = getMapLayerOperationalState(viewState);
  if (operationalState.type === "rebindRequired") {
    return (
      <Badge
        color="danger"
        variant="light"
        size="xs"
      >{t`Rebind required`}</Badge>
    );
  }
  if (operationalState.type === "spatialUnavailable") {
    return (
      <Badge
        color="warning"
        variant="light"
        size="xs"
      >{t`Geometry unavailable`}</Badge>
    );
  }
  return (
    <LayerLoadStatus
      viewState={viewState}
      operationalState={operationalState}
    />
  );
}
