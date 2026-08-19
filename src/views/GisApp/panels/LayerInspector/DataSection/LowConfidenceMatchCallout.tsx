import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import type { GeoBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import type { ReactNode } from "react";

type Props = {
  guess: GeoBindingGuess;
};

/** Dismissible warning for an x/y-style coordinate guess. */
export function LowConfidenceMatchCallout({ guess }: Props): ReactNode {
  const { t } = useLingui();
  const [isDismissed, setIsDismissed] = useState(false);
  return isDismissed ? null : (
      <Callout
        color="warning"
        withCloseButton
        closeButtonLabel={t`Dismiss`}
        onClose={() => {
          setIsDismissed(true);
        }}
      >
        {t`Latitude and longitude were matched from the column names ${guess.latitudeColumnName} and ${guess.longitudeColumnName}. Change them above if that is wrong.`}
      </Callout>
    );
}
