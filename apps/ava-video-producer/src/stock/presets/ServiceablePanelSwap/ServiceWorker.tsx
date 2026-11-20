import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { hand: { x: number; y: number } };
/**
 * Worker geometry maintains contact with the active latch or carried module.
 */
export function ServiceWorker({ hand }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <PersonGlyph
        x={hand.x + 22}
        y={hand.y + 62}
        role="participant"
        color={tokens.color.highlight}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${hand.x + 22} ${hand.y + 62} L${hand.x + 25} ${hand.y + 20} L${hand.x} ${hand.y}`,
        }}
        profile={tokens.sketch.shape}
        data-service-arm="true"
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <circle
        data-service-hand="true"
        cx={hand.x}
        cy={hand.y}
        r={5}
        fill={tokens.color.highlight}
      />
    </g>
  );
}
