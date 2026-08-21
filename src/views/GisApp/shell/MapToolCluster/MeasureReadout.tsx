import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/shell/MapToolCluster/MeasureReadout.module.css";
import { formatMapMeasureReadout } from "@/views/GisApp/tools/formatMapMeasureReadout/formatMapMeasureReadout";
import { getSphericalDistanceMeters } from "@/views/GisApp/tools/geodesy/getSphericalDistanceMeters/getSphericalDistanceMeters";
import { getSphericalPolygonAreaSquareMeters } from "@/views/GisApp/tools/geodesy/getSphericalPolygonAreaSquareMeters/getSphericalPolygonAreaSquareMeters";
import { isClosedRingValid } from "@/views/GisApp/tools/isClosedRingValid/isClosedRingValid";
import type { ReactNode } from "react";

type Props = {
  vertices: ReadonlyArray<[number, number]>;
};

function _formatMeasureNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(1);
}

/** Live geodesic length, and area once the measure ring is closed. */
export function MeasureReadout({ vertices }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  if (vertices.length < 2) {
    return null;
  }
  const meters = getSphericalDistanceMeters(vertices);
  const squareMeters =
    isClosedRingValid(vertices) ?
      getSphericalPolygonAreaSquareMeters(vertices)
    : undefined;
  const readout = formatMapMeasureReadout({ meters, squareMeters });
  const lengthValue = _formatMeasureNumber(readout.lengthValue);
  const lengthLabel =
    readout.lengthUnit === "m" ? t`${lengthValue} m` : t`${lengthValue} km`;
  let text = lengthLabel;
  if (readout.kind === "lengthAndArea") {
    const areaValue = _formatMeasureNumber(readout.areaValue);
    const areaLabel =
      readout.areaUnit === "m2" ? t`${areaValue} m²` : t`${areaValue} km²`;
    text = `${lengthLabel} · ${areaLabel}`;
  }
  return (
    <div
      className={css.measureReadout}
      role="status"
      aria-label={t`Measure readout`}
      aria-live="polite"
    >
      {text}
    </div>
  );
}
