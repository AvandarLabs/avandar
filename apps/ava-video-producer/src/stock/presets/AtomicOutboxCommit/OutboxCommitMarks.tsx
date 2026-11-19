import { mix, ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { OUTCOME_CUE } from "./outboxShape";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** Frames the shared latch takes to close. */
const LATCH_FRAMES = 54;
/** Frames a commit stamp takes to grow. */
const STAMP_FRAMES = 28;
/** One shared latch closes before both commit stamps appear. */
export function OutboxCommitMarks({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const latchY = mix(
    ramp(frame, 56, motion.scale(LATCH_FRAMES), motion.travel.easing),
    128,
    150,
  );
  return (
    <g>
      {" "}
      <g data-commit-latch="true">
        <SketchedShape
          shape={{ kind: "line", x1: 100, x2: 860, y1: latchY, y2: latchY }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
      <SketchedShape
        shape={{ kind: "path", d: `M465 ${latchY} v-12 h30 v12` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      {input.outcome === "commit"
        ? [400, 840].map((x) => {
            return (
              <circle
                key={x}
                data-commit-stamp={x}
                cx={x}
                cy={490}
                r={
                  9 *
                  ramp(
                    frame,
                    OUTCOME_CUE,
                    motion.scale(STAMP_FRAMES),
                    motion.entrance.easing,
                  )
                }
                fill={accent}
              />
            );
          })
        : undefined}
    </g>
  );
}
