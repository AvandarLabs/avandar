import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";
/** The common slope and outlet remain fixed through the intervention. */
export function SlopeGround(): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: "M80 200L750 380H910V415H80Z" }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M750 280V420" }}
        profile={tokens.sketch.shape}
        data-exit="boundary"
        stroke={tokens.color.inactive}
        strokeDasharray="5 5"
      />
    </g>
  );
}
