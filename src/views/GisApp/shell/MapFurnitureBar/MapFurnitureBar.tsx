import { formatNumber } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import css from "@/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar.module.css";
import { MapScale } from "@/views/GisApp/shell/MapFurnitureBar/MapScale/MapScale";
import { useMapPointerCoordinates } from "@/views/GisApp/shell/MapFurnitureBar/useMapPointerCoordinates/useMapPointerCoordinates";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import type { MessageDescriptor } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  mapInstance: MapInstance;

  /** Attribution for the current basemap. */
  attribution: string;

  /** Persisted disclaimer, or unset to show the localized default. */
  disclaimer: string | undefined;
};

/** Returns the localized-message descriptor for one coordinate hemisphere. */
function _hemisphereMessage(
  options: Readonly<{ value: number; axis: "lat" | "lng" }>,
): MessageDescriptor {
  const { value, axis } = options;
  return match({ axis, isNegative: value < 0 })
    .with({ axis: "lat", isNegative: true }, () => {
      return msg`S`;
    })
    .with({ axis: "lat", isNegative: false }, () => {
      return msg`N`;
    })
    .with({ axis: "lng", isNegative: true }, () => {
      return msg`W`;
    })
    .with({ axis: "lng", isNegative: false }, () => {
      return msg`E`;
    })
    .exhaustive();
}

/** Renders the docked coordinate, scale, attribution, and disclaimer strip. */
export function MapFurnitureBar({
  mapInstance,
  attribution,
  disclaimer,
}: Props): ReactNode {
  const { i18n, t } = useLingui();
  const coordinates = useMapPointerCoordinates(mapInstance);
  const scale = MapScale.useMapScale(mapInstance);

  return (
    <div className={css.mapFurnitureBar} data-testid="map-furniture-bar">
      <span className={css.mapFurnitureBarCoordinates}>
        {coordinates
          ? `${formatNumber(Math.abs(coordinates.latitude), {
              locale: i18n.locale,
              minimumFractionDigits: 3,
              maximumFractionDigits: 3,
              useGrouping: false,
            })} ${i18n._(
              _hemisphereMessage({ value: coordinates.latitude, axis: "lat" }),
            )}, ${formatNumber(Math.abs(coordinates.longitude), {
              locale: i18n.locale,
              minimumFractionDigits: 3,
              maximumFractionDigits: 3,
              useGrouping: false,
            })} ${i18n._(
              _hemisphereMessage({ value: coordinates.longitude, axis: "lng" }),
            )}`
          : t`Move the pointer over the map to read a coordinate`}
      </span>
      <span className={css.mapFurnitureBarSpacer} />
      {scale?.kind === "bar" ? (
        <span className={css.mapFurnitureBarScale}>
          <span>
            {scale.meters >= 1000
              ? t`${scale.meters / 1000} km`
              : t`${scale.meters} m`}
          </span>
          <span
            aria-hidden
            className={css.mapFurnitureBarScaleRule}
            style={{ width: scale.widthPx }}
          />
        </span>
      ) : null}
      {scale?.kind === "varies" ? (
        <span className={css.mapFurnitureBarScale}>
          {t`Scale varies across this map`}
        </span>
      ) : null}
      <span className={css.mapFurnitureBarAttribution}>{attribution}</span>
      <span className={css.mapFurnitureBarDisclaimer}>
        {disclaimer ??
          t`The boundaries and names shown do not imply official endorsement or acceptance.`}
      </span>
    </div>
  );
}
