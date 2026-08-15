import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useState } from "react";
import { getMapLayerOperationalState } from "@/views/GisApp/layers/getMapLayerOperationalState";
import css from "@/views/GisApp/panels/MapStatusCard/MapStatusCard.module.css";
import { MapStatusContent } from "@/views/GisApp/panels/MapStatusCard/MapStatusContent";
import { MapStatusIcon } from "@/views/GisApp/panels/MapStatusCard/MapStatusIcon";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T | undefined;
  viewState: MapLayerViewState | undefined;

  /** Opens the selected layer's Filter section. */
  onReviewFilter: () => void;
};

/** The selected layer's status, when it needs an action. */
export function MapStatusCard({
  layer,
  viewState,
  onReviewFilter,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const [areDetailsOpen, setAreDetailsOpen] = useState(false);
  if (!layer || !viewState) {
    return null;
  }
  const operationalState = getMapLayerOperationalState(viewState);
  if (
    operationalState.type === "unbound" ||
    operationalState.type === "ready"
  ) {
    return null;
  }
  const hasPartialMapping =
    viewState.status === "ready" && viewState.droppedRowCount > 0;
  const totalRowCount = viewState.featureCount + viewState.droppedRowCount;
  return (
    <div
      className={css.mapStatusCard}
      role={viewState.status === "error" ? "alert" : "status"}
    >
      <span
        className={clsx(
          css.mapStatusCardIcon,
          viewState.status === "error" && css.mapStatusCardIconDanger,
          hasPartialMapping && css.mapStatusCardIconWarning,
          (viewState.status === "loading" || viewState.status === "empty") &&
            css.mapStatusCardIconInfo,
        )}
        aria-hidden
      >
        <MapStatusIcon
          status={viewState.status}
          hasPartialMapping={hasPartialMapping}
        />
      </span>
      <span>
        <MapStatusContent
          layer={layer}
          viewState={viewState}
          hasPartialMapping={hasPartialMapping}
          totalRowCount={totalRowCount}
          i18n={i18n}
          areDetailsOpen={areDetailsOpen}
          onToggleDetails={() => {
            setAreDetailsOpen((current) => {
              return !current;
            });
          }}
          onReviewFilter={onReviewFilter}
        />
      </span>
    </div>
  );
}
