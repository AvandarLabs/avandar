import { msg } from "@lingui/core/macro";
import { Button } from "@mantine/core";
import { getMapLayerOperationalState } from "@/views/GisApp/layers/getMapLayerOperationalState/getMapLayerOperationalState";
import { MapLoadStatusContent } from "@/views/GisApp/panels/MapStatusCard/MapLoadStatusContent";
import css from "@/views/GisApp/panels/MapStatusCard/MapStatusCard.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  viewState: MapLayerViewState;
  hasPartialMapping: boolean;
  totalRowCount: number;
  i18n: I18n;
  areDetailsOpen: boolean;
  onToggleDetails: () => void;
  onReviewFilter: () => void;
  onSeeWhy: () => void;
};

type OperationalCopy = {
  title: string;
  body: string;
  showRetry: boolean;
};

function _getOperationalCopy(options: {
  operationalState: ReturnType<typeof getMapLayerOperationalState>;
  i18n: I18n;
}): OperationalCopy | undefined {
  const { operationalState, i18n } = options;
  if (operationalState.type === "rebindRequired") {
    return {
      title: i18n._(msg`Geometry must be rebound`),
      body: i18n._(
        msg`A saved dataset or column reference is no longer available. Choose a replacement in the layer inspector.`,
      ),
      showRetry: false,
    };
  }
  if (operationalState.type === "spatialUnavailable") {
    return {
      title: i18n._(msg`Spatial is unavailable`),
      body: i18n._(
        msg`The layer configuration is saved. Retry after connectivity or the Spatial extension becomes available.`,
      ),
      showRetry: true,
    };
  }
  if (operationalState.type === "suppressed") {
    return {
      title: i18n._(msg`${operationalState.featureCount} areas are suppressed`),
      body: i18n._(
        msg`Their contributor counts stay hidden because they are below the layer's minimum.`,
      ),
      showRetry: false,
    };
  }
  if (operationalState.type === "noData") {
    return {
      title: i18n._(msg`${operationalState.featureCount} areas have no data`),
      body: i18n._(
        msg`These boundaries have no reportable value for the current query.`,
      ),
      showRetry: false,
    };
  }
  return undefined;
}

/** Renders the selected layer's status-specific content. */
export function MapStatusContent({
  layer,
  viewState,
  hasPartialMapping,
  totalRowCount,
  i18n,
  areDetailsOpen,
  onToggleDetails,
  onReviewFilter,
  onSeeWhy,
}: Props): ReactNode {
  const operationalState = getMapLayerOperationalState(viewState);
  const copy = _getOperationalCopy({ operationalState, i18n });
  if (!copy) {
    return (
      <MapLoadStatusContent
        layer={layer}
        viewState={viewState}
        hasPartialMapping={hasPartialMapping}
        totalRowCount={totalRowCount}
        i18n={i18n}
        areDetailsOpen={areDetailsOpen}
        onToggleDetails={onToggleDetails}
        onReviewFilter={onReviewFilter}
        onSeeWhy={onSeeWhy}
      />
    );
  }
  return (
    <>
      <span className={css.mapStatusCardTitle}>{copy.title}</span>
      <span className={css.mapStatusCardBody}>{copy.body}</span>
      {copy.showRetry ? (
        <Button size="compact-xs" variant="default" onClick={viewState.onRetry}>
          {i18n._(msg`Retry`)}
        </Button>
      ) : null}
    </>
  );
}
