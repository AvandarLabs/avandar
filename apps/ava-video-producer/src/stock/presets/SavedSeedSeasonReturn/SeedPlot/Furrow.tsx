import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The sowing furrow, drawn across the plot. */
export function Furrow({
  frame,
  accent,
}: Readonly<{ frame: number; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-furrow="">
      <SketchedShape
        shape={{
          kind: "line",
          x1: 738,
          y1: 399,
          x2:
            738 +
            180 * motion.ramp(frame, 108, motion.whip, motion.entrance.easing),
          y2: 399,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
