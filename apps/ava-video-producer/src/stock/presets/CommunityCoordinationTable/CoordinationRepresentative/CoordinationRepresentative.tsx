import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  handX: number;
  handY: number;
};
/** Shows the representative pointing at the agreed destination. */
export function CoordinationRepresentative({
  tokens,
  scales,
  handX,
  handY,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <PersonGlyph
        x={350}
        y={485}
        size={40}
        color={tokens.color.highlight}
        role="facilitator"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M350 485 L${(350 + handX) / 2} ${handY + 24} L${handX} ${handY}`,
        }}
        profile={tokens.sketch.shape}
        data-community-arm
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <circle
        data-community-hand
        cx={handX}
        cy={handY}
        r={3}
        fill={tokens.color.highlight}
      />
    </>
  );
}
