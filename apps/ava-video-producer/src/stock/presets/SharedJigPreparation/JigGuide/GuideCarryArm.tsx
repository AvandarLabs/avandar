import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The arm and hand holding the guide. */
export function GuideCarryArm({
  guideX,
}: Readonly<{ guideX: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${guideX} 440 L${guideX - 20} 430 L${guideX} 382`,
        }}
        profile={tokens.sketch.shape}
        data-carry-arm="true"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
      <circle
        data-guide-hand="true"
        cx={guideX}
        cy={382}
        r={5}
        fill={tokens.color.highlight}
      />
    </>
  );
}
