import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The tab sliding from the earlier total to the revised one. */
export function ReportingTab({
  frame,
  accent,
}: Readonly<{ frame: number; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-reporting-tab="">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${mix(motion.ramp(frame, 36, motion.scale(36), motion.entrance.easing), 60, 500)} 198h380`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}
