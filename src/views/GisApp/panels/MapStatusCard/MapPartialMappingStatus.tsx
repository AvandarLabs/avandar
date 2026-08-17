import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Button } from "@mantine/core";
import css from "@/views/GisApp/panels/MapStatusCard/MapStatusCard.module.css";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  droppedRowCount: number;
  totalRowCount: number;
  largestDropReason: MapLayerViewState["largestDropReason"];
  i18n: I18n;
  onSeeWhy: () => void;
};

/** Renders the partial mapping message for the selected layer. */
export function MapPartialMappingStatus({
  droppedRowCount,
  totalRowCount,
  largestDropReason,
  i18n,
  onSeeWhy,
}: Props): ReactNode {
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
      <Button size="compact-xs" variant="default" onClick={onSeeWhy}>
        {i18n._(msg`See why`)}
      </Button>
    </>
  );
}
