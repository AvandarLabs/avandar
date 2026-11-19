import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ComplaintPlacement } from "./ComplaintPlacement";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The participant operates and reports; the worker only replaces the part. */
export function RemedyActions({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const isRetesting =
    frame >= 88 && frame <= 108 && input.testResults.after !== "not-tested";
  const isInitial = frame >= 10 && frame <= 30;
  const reach = isRetesting
    ? motion.ramp(frame, 88, motion.whip)
    : motion.ramp(frame, 10, motion.scale(10));
  const replacement = motion.ramp(frame, 56, motion.scale(22));
  return (
    <g>
      {isInitial || isRetesting ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M200 310 L${mix(reach, 220, 560)} ${mix(reach, 325, 330)}`,
          }}
          profile={tokens.sketch.shape}
          data-operation={isRetesting ? "retest" : "initial-test"}
          data-actor="participant"
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(5)}
          strokeLinecap="round"
        />
      ) : undefined}
      {frame >= 44 && frame <= 78 ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M760 310 L${mix(replacement, 742, 562)} ${mix(replacement, 374, 330)}`,
          }}
          profile={tokens.sketch.shape}
          data-repair-hand="worker"
          fill="none"
          stroke={tokens.color.accentAlt}
          strokeWidth={scales.stroke(5)}
          strokeLinecap="round"
        />
      ) : undefined}
      <ComplaintPlacement frame={frame} input={input} accent={accent} />
    </g>
  );
}
