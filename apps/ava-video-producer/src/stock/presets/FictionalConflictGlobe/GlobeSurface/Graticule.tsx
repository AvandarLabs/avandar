import { geoGraticule10 } from "d3-geo";
import { GlobeProjection } from "../../../geography/GlobeProjection/GlobeProjection";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** Ten-degree graticules, clipped to the visible hemisphere. */
export function Graticule({
  view,
}: Readonly<{
  view: Readonly<{
    centerLongitude: number;
    centerLatitude: number;
    radius: number;
  }>;
}>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d:
          GlobeProjection.getPathFromGeometry({
            ...view,
            geometry: geoGraticule10(),
          }) ?? "",
      }}
      profile={tokens.sketch.shape}
      data-graticule="world"
      fill="none"
      stroke={tokens.color.line}
      strokeWidth={scales.stroke(0.7)}
    />
  );
}
