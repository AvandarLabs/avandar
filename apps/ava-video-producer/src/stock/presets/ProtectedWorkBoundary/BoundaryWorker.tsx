import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getRequestPositionFromInputAndFrame } from "./getRequestPositionFromInputAndFrame";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The worker's arm stays in contact through the request's lift and travel. */
export function BoundaryWorker({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const request = getRequestPositionFromInputAndFrame({ motion, frame, input });
  return (
    <g>
      <SketchedShape
        shape={{ kind: "circle", cx: 85, cy: 85, r: 18 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M65 155 V118 Q85 98 105 118 V155" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <LabelSlots labels={[[input.workerLabel, 130, 40, 250, 12, 3]]} />
      <g opacity={motion.ramp(frame, 39, motion.scale(7))}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M105 120 Q${request.x - 25} 65 ${request.x} ${request.y + 12}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
    </g>
  );
}
