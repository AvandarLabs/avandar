import { GlobeProjection } from "../../../geography/GlobeProjection/GlobeProjection";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** A globe for context; it does not locate the detached tile. */
export function GlobeContext(): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-globe-context="true" transform="translate(115 175)">
      <SketchedShape
        shape={{ kind: "circle", cx: 0, cy: 0, r: 65 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <path
        d={GlobeProjection.getLandPathFromView({
          centerLongitude: 0,
          centerLatitude: 15,
          radius: 65,
        })}
        fill={tokens.color.inactive}
        fillOpacity={atomic.opacity["70"]}
      />
    </g>
  );
}
