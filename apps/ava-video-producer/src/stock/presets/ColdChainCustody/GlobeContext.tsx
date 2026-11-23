import { GlobeProjection } from "../../geography/GlobeProjection/GlobeProjection";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { accent: string };

/** A small globe placing the schematic route in its world. */
export function GlobeContext({ accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-globe="context" transform="translate(900 50)">
      <SketchedShape
        shape={{ kind: "circle", cx: 0, cy: 0, r: 30 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <path
        d={GlobeProjection.getLandPathFromView({
          centerLongitude: 10,
          centerLatitude: 15,
          radius: 30,
        })}
        fill={accent}
        fillOpacity={tokens.alpha.guide}
      />
    </g>
  );
}
