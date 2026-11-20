import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LATE_CUE, RESOLVED_CUE, TRANSFER_CUE } from "./evidenceTiming";
import type { Input } from "./LateTypeEvidence.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** The source review bracket stays outside the active transfer interval. */
export function TypeReviewBracket({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  // The bracket has drawn the frame before values transfer.
  const progress = ramp(
    frame,
    LATE_CUE,
    TRANSFER_CUE - 1 - LATE_CUE,
    motion.reveal.easing,
  );
  return frame >= TRANSFER_CUE && frame < RESOLVED_CUE ? undefined : (
    <g data-review-bracket="">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M 414 225 h 14 v ${(input.values.length * 50 - 8) * progress} h -14`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        opacity={progress}
      />
    </g>
  );
}
