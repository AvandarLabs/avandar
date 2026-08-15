import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/panels/LayerInspector/LayerInspector.module.css";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

type Props = { viewState: MapLayerViewState | undefined };

/** Summarizes how the selected layer's data is rendering. */
export function LayerLeadStatus({ viewState }: Props): ReactNode {
  const { t } = useLingui();
  if (!viewState) {
    return null;
  }
  const mapped = viewState.featureCount;
  const total = mapped + viewState.droppedRowCount;
  const status = matchLiteral(viewState.status, {
    unbound: t`Not plotted yet`,
    loading: t`Loading`,
    error: t`Could not load`,
    empty: t`0 rows`,
    ready: t`${mapped} of ${total} rows mapped`,
  });
  return <div className={css.layerInspectorLeadStatus}>{status}</div>;
}
