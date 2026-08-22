import type {
  DropReason,
  GeometryDropReport,
} from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MessageDescriptor } from "@lingui/core";
import type { ReactNode } from "react";

import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Plural, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useMemo } from "react";

type Props = {
  drop: GeometryDropReport;
  onSwapLatLng: () => void;
};

function _title(reason: DropReason): MessageDescriptor {
  return matchLiteral(reason, {
    suspectedLatLngSwap: msg`Latitude and longitude look swapped`,
    nullIsland: msg`Coordinate is 0, 0`,
    outOfRange: msg`Coordinate is outside the valid range`,
    nullCoordinate: msg`Latitude or longitude is empty`,
    nonNumericCoordinate: msg`Latitude or longitude is not a number`,
  });
}

function _explanation(reason: DropReason): MessageDescriptor {
  return matchLiteral(reason, {
    suspectedLatLngSwap: msg`Latitude is outside the valid range but would be a valid longitude, and the reverse.`,
    nullIsland: msg`This point falls in the Gulf of Guinea and is almost always a missing value written as a zero.`,
    outOfRange: msg`Latitude must be between -90 and 90, and longitude must be between -180 and 180.`,
    nullCoordinate: msg`A coordinate cannot be mapped when either latitude or longitude is empty.`,
    nonNumericCoordinate: msg`Latitude and longitude must both be numbers.`,
  });
}

/** Presents one coordinate drop reason and its bounded row samples. */
export function CoordinateValidationReason({
  drop,
  onSwapLatLng,
}: Props): ReactNode {
  const { i18n, t } = useLingui();
  const listFormat = useMemo(() => {
    return new Intl.ListFormat(i18n.locale);
  }, [i18n.locale]);
  const rowIndexes = listFormat.format(drop.sampleRowIndexes.map(String));
  return (
    <li>
      <h4>{i18n._(_title(drop.reason))}</h4>
      <div>
        <Plural value={drop.count} one="# row" other="# rows" />
      </div>
      <p>
        {drop.sampleRowIndexes.length === 1
          ? t`Row ${rowIndexes}.`
          : t`Rows ${rowIndexes}.`}{" "}
        {i18n._(_explanation(drop.reason))}
      </p>
      {drop.reason === "suspectedLatLngSwap" ? (
        <Button size="compact-xs" variant="default" onClick={onSwapLatLng}>
          {t`Swap latitude and longitude`}
        </Button>
      ) : null}
    </li>
  );
}
