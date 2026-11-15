import { DimensionTicks } from "./DimensionTicks";
import type { ParcelEnvelopeGeometry } from "./makeParcelEnvelopeGeometryFromParcel";
import type { ReactNode } from "react";

type Props = {
  parcelId: string;
  index: number;
  geometry: ParcelEnvelopeGeometry;
};
/**
 * Original and inset ticks retain the measured rectangle, including zero area.
 */
export function ParcelDimensions({
  parcelId,
  index,
  geometry,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <DimensionTicks {...geometry.original} marker={parcelId} />
      {geometry.inset.width > 0 && geometry.inset.height > 0 ? (
        <DimensionTicks
          {...geometry.inset}
          marker={`${index}-inset`}
          side="inside"
        />
      ) : undefined}
    </g>
  );
}
