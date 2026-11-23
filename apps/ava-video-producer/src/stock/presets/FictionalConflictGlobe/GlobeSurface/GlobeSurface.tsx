import { geoGraticule10 } from "d3-geo";
import { GlobeProjection } from "../../../geography/GlobeProjection/GlobeProjection";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { Graticule } from "./Graticule";
import type { ReactNode } from "react";

type Props = { longitude: number; showGraticule: boolean };
/** Pinned physical land and optional graticules share hemisphere clipping. */
export function GlobeSurface({
  longitude,
  showGraticule,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const view = { centerLongitude: longitude, centerLatitude: 0, radius: 195 };
  return (
    <g
      data-globe="world"
      data-longitude={longitude}
      transform="translate(390 285)"
    >
      <SketchedShape
        shape={{ kind: "circle", cx: 0, cy: 0, r: 195 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
      />
      {showGraticule ? <Graticule view={view} /> : undefined}
      <SketchedShape
        shape={{
          kind: "path",
          d: GlobeProjection.getLandPathFromView(view) ?? "",
        }}
        profile={tokens.sketch.shape}
        data-geography="natural-earth-land"
        fill={tokens.color.elevated}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(0.7)}
      />
    </g>
  );
}
