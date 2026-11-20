import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getAllocationHandlingFromTokens } from "../getAllocationHandlingFromTokens";
import type { ReactNode } from "react";
/** The coordinator's arm and the hand holding the scoop. */
export function CoordinatorArm({
  pose,
}: Readonly<{
  pose: ReturnType<typeof getAllocationHandlingFromTokens>;
}>): ReactNode {
  const graphicTokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <g data-coordinator-arm>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${pose.bodyX} ${pose.bodyY} L${pose.bodyX - 12} ${pose.handY - 4} L${pose.handX} ${pose.handY}`,
          }}
          profile={graphicTokens.sketch.shape}
          stroke={graphicTokens.color.accentAlt}
          strokeWidth={scales.stroke(2.5)}
          fill="none"
        />
      </g>
      <circle
        data-coordinator-hand
        cx={pose.handX}
        cy={pose.handY}
        r={3.5}
        fill={graphicTokens.color.accentAlt}
      />
    </>
  );
}
