import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
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
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${geometry.original.x} ${geometry.original.y} L620 ${168 + index * 140}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
        strokeOpacity={tokens.alpha.ghost}
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
