import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";

import { getMapLayerOperationalState } from "@/views/GisApp/layers/getMapLayerOperationalState/getMapLayerOperationalState";
import css from "@/views/GisApp/panels/LayerInspector/LayerLeadStatus/LayerLeadStatus.module.css";

type Props = {
  viewState: MapLayerViewState | undefined;
  onOpenMatchReport?: () => void;
};

/** Summarizes how the selected layer's data is rendering. */
export function LayerLeadStatus({
  viewState,
  onOpenMatchReport,
}: Props): ReactNode {
  const { t } = useLingui();
  if (!viewState) {
    return null;
  }
  const mapped = viewState.featureCount;
  const total = mapped + viewState.droppedRowCount;
  const operationalState = getMapLayerOperationalState(viewState);
  const status =
    operationalState.type === "rebindRequired"
      ? t`Geometry must be rebound`
      : operationalState.type === "spatialUnavailable"
        ? t`Spatial is unavailable`
        : operationalState.type === "suppressed"
          ? t`${operationalState.featureCount} areas suppressed`
          : operationalState.type === "noData"
            ? t`${operationalState.featureCount} areas have no data`
            : matchLiteral(viewState.status, {
                unbound: t`Not plotted yet`,
                loading: t`Loading`,
                error: t`Could not load`,
                empty: t`0 rows`,
                ready: t`${mapped} of ${total} rows mapped`,
              });
  return (
    <div className={css.layerLeadStatus}>
      {status}
      {viewState.spatialDiagnostics?.matchedSourceKeyCount !== undefined &&
      onOpenMatchReport ? (
        <Button variant="subtle" size="compact-xs" onClick={onOpenMatchReport}>
          {t`Review matches`}
        </Button>
      ) : null}
    </div>
  );
}
