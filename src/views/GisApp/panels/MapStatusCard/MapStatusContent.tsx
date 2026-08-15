import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Button } from "@mantine/core";
import { getMapLayerOperationalState } from "@/views/GisApp/layers/getMapLayerOperationalState";
import { MapEmptyStatus } from "@/views/GisApp/panels/MapStatusCard/MapEmptyStatus";
import { MapErrorStatus } from "@/views/GisApp/panels/MapStatusCard/MapErrorStatus";
import { MapLoadingStatus } from "@/views/GisApp/panels/MapStatusCard/MapLoadingStatus";
import { MapPartialMappingStatus } from "@/views/GisApp/panels/MapStatusCard/MapPartialMappingStatus";
import css from "@/views/GisApp/panels/MapStatusCard/MapStatusCard.module.css";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { I18n } from "@lingui/core";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
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
};

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
}: Props): ReactNode {
  const operationalState = getMapLayerOperationalState(viewState);
  if (operationalState.type === "rebindRequired") {
    return (
      <>
        <span className={css.mapStatusCardTitle}>
          {i18n._(msg`Geometry must be rebound`)}
        </span>
        <span className={css.mapStatusCardBody}>
          {i18n._(
            msg`A saved dataset or column reference is no longer available. Choose a replacement in the layer inspector.`,
          )}
        </span>
      </>
    );
  }
  if (operationalState.type === "spatialUnavailable") {
    return (
      <>
        <span className={css.mapStatusCardTitle}>
          {i18n._(msg`Spatial is unavailable`)}
        </span>
        <span className={css.mapStatusCardBody}>
          {i18n._(
            msg`The layer configuration is saved. Retry after connectivity or the Spatial extension becomes available.`,
          )}
        </span>
        <Button size="compact-xs" variant="default" onClick={viewState.onRetry}>
          {i18n._(msg`Retry`)}
        </Button>
      </>
    );
  }
  if (operationalState.type === "suppressed") {
    return (
      <>
        <span className={css.mapStatusCardTitle}>
          {i18n._(msg`${operationalState.count} areas are suppressed`)}
        </span>
        <span className={css.mapStatusCardBody}>
          {i18n._(
            msg`Their contributor counts stay hidden because they are below the layer's minimum.`,
          )}
        </span>
      </>
    );
  }
  if (operationalState.type === "noData") {
    return (
      <>
        <span className={css.mapStatusCardTitle}>
          {i18n._(msg`${operationalState.count} areas have no data`)}
        </span>
        <span className={css.mapStatusCardBody}>
          {i18n._(
            msg`These boundaries have no reportable value for the current query.`,
          )}
        </span>
      </>
    );
  }
  return matchLiteral(viewState.status, {
    unbound: () => {
      return null;
    },
    loading: () => {
      return <MapLoadingStatus layerName={layer.name} i18n={i18n} />;
    },
    error: () => {
      return (
        <MapErrorStatus
          layerName={layer.name}
          viewState={viewState}
          i18n={i18n}
          areDetailsOpen={areDetailsOpen}
          onToggleDetails={onToggleDetails}
        />
      );
    },
    empty: () => {
      return (
        <MapEmptyStatus
          layerName={layer.name}
          filterCount={viewState.filterCount}
          i18n={i18n}
          onReviewFilter={onReviewFilter}
        />
      );
    },
    ready: () => {
      return hasPartialMapping ?
          <MapPartialMappingStatus
            droppedRowCount={viewState.droppedRowCount}
            totalRowCount={totalRowCount}
            largestDropReason={viewState.largestDropReason}
            i18n={i18n}
          />
        : null;
    },
  });
}
