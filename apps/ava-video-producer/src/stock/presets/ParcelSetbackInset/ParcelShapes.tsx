import { STOCK } from "../../stockPalette";
import type { ParcelEnvelopeGeometry } from "./makeParcelEnvelopeGeometryFromParcel";
import type { ReactNode } from "react";

type Props = {
  parcelId: string;
  geometry: ParcelEnvelopeGeometry;
  accent: string;
  hatchId: string;
};
/**
 * The full original rectangle and nonnegative inset remain visible together.
 */
export function ParcelShapes({
  parcelId,
  geometry,
  accent,
  hatchId,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-original-parcel={parcelId}
        {...geometry.original}
        fill={`url(#${hatchId})`}
        stroke={STOCK.muted}
        strokeWidth={1.5}
      />
      <rect
        data-envelope={parcelId}
        data-envelope-width={geometry.finalWidth}
        data-envelope-height={geometry.finalHeight}
        {...geometry.inset}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={1.5}
      />
    </g>
  );
}
