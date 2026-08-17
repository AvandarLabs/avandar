import { matchLiteral } from "@avandar/utils";
import { MapEmptyStatus } from "@/views/GisApp/panels/MapStatusCard/MapEmptyStatus";
import { MapErrorStatus } from "@/views/GisApp/panels/MapStatusCard/MapErrorStatus";
import { MapLoadingStatus } from "@/views/GisApp/panels/MapStatusCard/MapLoadingStatus";
import { MapReadyPartialStatus } from "@/views/GisApp/panels/MapStatusCard/MapReadyPartialStatus";
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
  onSeeWhy: () => void;
};

/** Status content for a layer that is still loading, empty, or ready. */
export function MapLoadStatusContent({
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
      return (
        <MapReadyPartialStatus
          viewState={viewState}
          hasPartialMapping={hasPartialMapping}
          totalRowCount={totalRowCount}
          i18n={i18n}
          onSeeWhy={onSeeWhy}
        />
      );
    },
  });
}
