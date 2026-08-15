import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Button, Loader, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleX,
  IconInfoCircle,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useState } from "react";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import css from "@/views/GisApp/panels/MapStatusCard/MapStatusCard.module.css";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { I18n } from "@lingui/core";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T | undefined;
  viewState: MapLayerViewState | undefined;

  /** Opens the selected layer's Filter section. */
  onReviewFilter: () => void;
};

/** Resolves structured geometry failures into localized display details. */
function _getErrorDetails(error: Error | undefined, i18n: I18n): string {
  if (error instanceof SensitivityViolationError) {
    return matchLiteral(error.code, {
      aggregateOnly: i18n._(
        msg`Aggregate-only layers cannot be drawn from individual coordinates.`,
      ),
      aggregateOnlyLayerSpec: i18n._(
        msg`Layer ${error.layerName ?? ""} is aggregate-only and cannot be drawn as individual symbols.`,
      ),
    });
  }
  return error?.message ?? "";
}

/** Renders the icon for the selected layer's status. */
function _renderMapStatusIcon(
  status: MapLayerViewState["status"],
  hasPartialMapping: boolean,
): ReactNode {
  if (status === "loading") {
    return <Loader size={14} />;
  }
  if (status === "error") {
    return <IconCircleX size={15} stroke={1.8} />;
  }
  if (hasPartialMapping) {
    return <IconAlertTriangle size={15} stroke={1.8} />;
  }
  return <IconInfoCircle size={15} stroke={1.8} />;
}

/** Renders the loading message for the selected layer. */
function _renderMapLoadingStatus(layerName: string, i18n: I18n): ReactNode {
  return (
    <>
      <span className={css.mapStatusCardTitle}>
        {i18n._(msg`Loading ${layerName}`)}
      </span>
      <span className={css.mapStatusCardBody}>
        {i18n._(msg`Running the layer's query.`)}
      </span>
    </>
  );
}

/** Renders the error message and actions for the selected layer. */
function _renderMapErrorStatus(
  layerName: string,
  viewState: MapLayerViewState,
  i18n: I18n,
  areDetailsOpen: boolean,
  onToggleDetails: () => void,
): ReactNode {
  return (
    <>
      <span className={css.mapStatusCardTitle}>
        {i18n._(msg`Could not load ${layerName}`)}
      </span>
      <span className={css.mapStatusCardBody}>
        {i18n._(
          msg`The layer's query failed. This usually means the dataset has changed or is no longer available in this workspace.`,
        )}
      </span>
      <span className={css.mapStatusCardActions}>
        <Button size="compact-xs" variant="default" onClick={viewState.onRetry}>
          {i18n._(msg`Retry`)}
        </Button>
        <Button
          size="compact-xs"
          variant="subtle"
          aria-expanded={areDetailsOpen}
          onClick={onToggleDetails}
        >
          {i18n._(msg`Show details`)}
        </Button>
      </span>
      {areDetailsOpen ?
        <Text className={css.mapStatusCardDetails} size="xs" c="dimmed" mt="xs">
          {_getErrorDetails(viewState.error, i18n)}
        </Text>
      : null}
    </>
  );
}

/** Renders the empty result message and optional filter action. */
function _renderMapEmptyStatus(
  layerName: string,
  filterCount: number,
  i18n: I18n,
  onReviewFilter: () => void,
): ReactNode {
  const filterMessage =
    filterCount === 0 ? msg`The source has no rows.`
    : filterCount === 1 ?
      msg`One filter is active on this layer. It may be excluding everything.`
    : msg`${filterCount} filters are active on this layer. They may be excluding everything.`;

  return (
    <>
      <span className={css.mapStatusCardTitle}>
        {i18n._(msg`${layerName} returned no rows`)}
      </span>
      <span className={css.mapStatusCardBody}>{i18n._(filterMessage)}</span>
      {filterCount > 0 ?
        <span className={css.mapStatusCardActions}>
          <Button size="compact-xs" variant="default" onClick={onReviewFilter}>
            {i18n._(msg`Review filter`)}
          </Button>
        </span>
      : null}
    </>
  );
}

/** Renders the partial mapping message for the selected layer. */
function _renderMapPartialMappingStatus(
  droppedRowCount: number,
  totalRowCount: number,
  largestDropReason: MapLayerViewState["largestDropReason"],
  i18n: I18n,
): ReactNode {
  const reasonMessage = matchLiteral(largestDropReason ?? "nullCoordinate", {
    suspectedLatLngSwap: msg`Some rows look like their latitude and longitude are swapped.`,
    nullIsland: msg`Some coordinates are 0, 0.`,
    outOfRange: msg`Some coordinates are outside the valid range.`,
    nullCoordinate: msg`Some rows have an empty latitude or longitude.`,
    nonNumericCoordinate: msg`Some latitudes or longitudes are not numbers.`,
  });

  return (
    <>
      <span className={css.mapStatusCardTitle}>
        {i18n._(
          msg`${droppedRowCount} of ${totalRowCount} rows could not be mapped`,
        )}
      </span>
      <span className={css.mapStatusCardBody}>{i18n._(reasonMessage)}</span>
    </>
  );
}

/** Renders the selected layer's status-specific content. */
function _renderMapStatusContent(
  layer: MapLayer.T,
  viewState: MapLayerViewState,
  hasPartialMapping: boolean,
  totalRowCount: number,
  i18n: I18n,
  areDetailsOpen: boolean,
  onToggleDetails: () => void,
  onReviewFilter: () => void,
): ReactNode {
  if (viewState.status === "loading") {
    return _renderMapLoadingStatus(layer.name, i18n);
  }
  if (viewState.status === "error") {
    return _renderMapErrorStatus(
      layer.name,
      viewState,
      i18n,
      areDetailsOpen,
      onToggleDetails,
    );
  }
  if (viewState.status === "empty") {
    return _renderMapEmptyStatus(
      layer.name,
      viewState.filterCount,
      i18n,
      onReviewFilter,
    );
  }
  if (hasPartialMapping) {
    return _renderMapPartialMappingStatus(
      viewState.droppedRowCount,
      totalRowCount,
      viewState.largestDropReason,
      i18n,
    );
  }
  return null;
}

function _renderStatusCard(
  layer: MapLayer.T,
  viewState: MapLayerViewState,
  i18n: I18n,
  areDetailsOpen: boolean,
  onToggleDetails: () => void,
  onReviewFilter: () => void,
): ReactNode {
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
        {_renderMapStatusIcon(viewState.status, hasPartialMapping)}
      </span>
      <span>
        {_renderMapStatusContent(
          layer,
          viewState,
          hasPartialMapping,
          totalRowCount,
          i18n,
          areDetailsOpen,
          onToggleDetails,
          onReviewFilter,
        )}
      </span>
    </div>
  );
}

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
  if (
    viewState.status === "unbound" ||
    (viewState.status === "ready" && viewState.droppedRowCount === 0)
  ) {
    return null;
  }
  return _renderStatusCard(
    layer,
    viewState,
    i18n,
    areDetailsOpen,
    () => {
      setAreDetailsOpen((current) => {
        return !current;
      });
    },
    onReviewFilter,
  );
}
