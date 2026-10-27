import { STOCK } from "../../stockPalette";
import { makeParcelEnvelopeGeometryFromParcel } from "./makeParcelEnvelopeGeometryFromParcel";
import { ParcelDimensions } from "./ParcelDimensions";
import { ParcelShapes } from "./ParcelShapes";
import type { Input } from "./ParcelSetbackInset.schema";
import type { ReactNode } from "react";
type Props = {
  parcel: Input["parcels"][number];
  index: number;
  setback: number;
  progress: number;
  accent: string;
  hatchId: string;
  showDimensions: boolean;
};
/**
 * Every side moves by the same clearance until an exhausted dimension
 * collapses.
 */
export function ParcelEnvelope({
  parcel,
  index,
  setback,
  progress,
  accent,
  hatchId,
  showDimensions,
}: Readonly<Props>): ReactNode {
  const geometry = makeParcelEnvelopeGeometryFromParcel({
    parcel,
    setback,
    progress,
  });
  return (
    <g data-parcel={parcel.id}>
      <ParcelShapes
        parcelId={parcel.id}
        geometry={geometry}
        accent={accent}
        hatchId={hatchId}
      />
      <path
        d={`M${geometry.original.x} ${geometry.original.y} L620 ${168 + index * 140}`}
        fill="none"
        stroke={STOCK.muted}
        strokeOpacity={0.25}
      />
      {showDimensions ? (
        <ParcelDimensions
          parcelId={parcel.id}
          index={index}
          geometry={geometry}
        />
      ) : undefined}
    </g>
  );
}
