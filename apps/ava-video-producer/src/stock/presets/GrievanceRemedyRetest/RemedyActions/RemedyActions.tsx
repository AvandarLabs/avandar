import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ComplaintPlacement } from "../ComplaintPlacement";
import { WorkerRepairHand } from "./WorkerRepairHand";
import type { Input } from "../GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
};
/** The participant operates and reports; the worker only replaces the part. */
export function RemedyActions({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const isRetesting =
    frame >= 88 && frame <= 108 && input.testResults.after !== "not-tested";
  const isInitial = frame >= 10 && frame <= 30;
  const reach = isRetesting
    ? motion.ramp(frame, 88, motion.whip)
    : motion.ramp(frame, 10, motion.scale(10));
  return (
    <g>
      {isInitial || isRetesting ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M200 310 L${Motion.mix({ t: reach, from: 220, to: 560 })} ${Motion.mix({ t: reach, from: 325, to: 330 })}`,
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
        <WorkerRepairHand frame={frame} />
      ) : undefined}
      <ComplaintPlacement {...{ frame, input, accent }} />
    </g>
  );
}
