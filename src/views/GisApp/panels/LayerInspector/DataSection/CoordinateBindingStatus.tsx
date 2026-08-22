import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { GeoBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import type { ReactNode } from "react";

import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";

import { LowConfidenceMatchCallout } from "@/views/GisApp/panels/LayerInspector/DataSection/LowConfidenceMatchCallout";

type Props = {
  layer: MapLayer.T;
  guess: GeoBindingGuess | undefined;
  isBound: boolean;
  hasCoordinateCandidates: boolean;
};

/** Explains inferred, incomplete, or unavailable coordinate bindings. */
export function CoordinateBindingStatus({
  layer,
  guess,
  isBound,
  hasCoordinateCandidates,
}: Props): ReactNode {
  const { t } = useLingui();
  return isBound ? (
    guess?.confidence === "low" ? (
      <LowConfidenceMatchCallout
        key={`${guess.latitudeColumnName}:${guess.longitudeColumnName}`}
        guess={guess}
      />
    ) : null
  ) : hasCoordinateCandidates ? (
    <Callout color="warning">
      {t`Pick both a latitude and a longitude column. One on its own plots every point on a diagonal line, which looks like a result and is not.`}
    </Callout>
  ) : layer.source.dataSource ? (
    <Callout color="info">
      <Stack gap="xs">
        <span>
          {t`No column in ${layer.source.dataSource.name} was recognized as a coordinate by name. Pick the latitude and longitude columns above, or bind a geometry column instead.`}
        </span>
      </Stack>
    </Callout>
  ) : null;
}
