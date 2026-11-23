import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-original-parcel={parcelId}
        {...geometry.original}
        fill={`url(#${hatchId})`}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
      <StockRect
        data-envelope={parcelId}
        data-envelope-width={geometry.finalWidth}
        data-envelope-height={geometry.finalHeight}
        {...geometry.inset}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
    </g>
  );
}
