import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { handX: number };

/** The planner's arm and hand on the approval control. */
export function PlannerHand({ handX }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: `M 187 182 L ${handX} 185` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(2.5)}
        fill="none"
      />
      <circle
        data-planner-hand="true"
        cx={handX}
        cy={185}
        r={3}
        fill={tokens.color.highlight}
      />
    </>
  );
}
