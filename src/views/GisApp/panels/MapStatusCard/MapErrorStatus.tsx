import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Button, Text } from "@mantine/core";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import css from "@/views/GisApp/panels/MapStatusCard/MapStatusCard.module.css";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  layerName: string;
  viewState: MapLayerViewState;
  i18n: I18n;
  areDetailsOpen: boolean;
  onToggleDetails: () => void;
};

/** Resolves structured geometry failures into localized display details. */
function _errorDetails(
  options: Readonly<{ error: Error | undefined; i18n: I18n }>,
): string {
  const { error, i18n } = options;
  return error instanceof SensitivityViolationError ?
      matchLiteral(error.code, {
        aggregateOnly: i18n._(
          msg`Aggregate-only layers cannot be drawn from individual coordinates.`,
        ),
        aggregateOnlyLayerSpec: i18n._(
          msg`Layer ${error.layerName ?? ""} is aggregate-only and cannot be drawn as individual symbols.`,
        ),
      })
    : (error?.message ?? "");
}

/** Renders the error message and actions for the selected layer. */
export function MapErrorStatus({
  layerName,
  viewState,
  i18n,
  areDetailsOpen,
  onToggleDetails,
}: Props): ReactNode {
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
          {_errorDetails({ error: viewState.error, i18n })}
        </Text>
      : null}
    </>
  );
}
