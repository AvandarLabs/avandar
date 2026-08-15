import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import type { GeoBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  guess: GeoBindingGuess | undefined;
  isBound: boolean;
  hasCoordinateCandidates: boolean;
};

/** Explains inferred, incomplete, or unavailable coordinate bindings. */
export function CoordinateBindingStatus(props: Props): ReactNode {
  const { t } = useLingui();
  const { layer, guess, isBound, hasCoordinateCandidates } = props;
  if (isBound && guess) {
    return (
      <Callout>
        {t`Latitude and longitude were matched from the column names ${guess.latitudeColumnName} and ${guess.longitudeColumnName}. Change them above if that is wrong.`}
      </Callout>
    );
  }
  if (hasCoordinateCandidates) {
    return (
      <Callout color="warning">
        {t`Pick both a latitude and a longitude column. One on its own plots every point on a diagonal line, which looks like a result and is not.`}
      </Callout>
    );
  }
  if (!layer.source.dataSource) {
    return null;
  }
  return (
    <Callout color="warning">
      <Stack gap="xs">
        <span>
          {t`No column in ${layer.source.dataSource.name} holds coordinates. Boundary joins arrive in a later release, so pick a different source.`}
        </span>
      </Stack>
    </Callout>
  );
}
