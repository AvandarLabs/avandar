import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReadingSeatPathFromFrame } from "../getReadingSeatPathFromFrame";
import type { ReactNode } from "react";

type Props = { learnerId: string; frame: number; angle: number };

/** The learner's seat, turning toward the circle. */
export function ReadingSeat({
  learnerId,
  frame,
  angle,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g data-reading-seat={learnerId}>
      <SketchedShape
        shape={{
          kind: "path",
          d: getReadingSeatPathFromFrame({ frame, angle, motion }),
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
