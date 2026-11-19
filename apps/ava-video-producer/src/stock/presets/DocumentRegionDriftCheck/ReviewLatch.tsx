import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; matched: boolean };

/** Frames the review latch takes to close. */
const CLOSE_FRAMES = 38;
/** The latch's line weight before the line weight scales it. */
const LATCH_STROKE = 5;
/**
 * A mismatching source closes the review latch instead of replacing content.
 */
export function ReviewLatch({
  input,
  frame,
  accent,
  matched,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const closure = ramp(
      frame,
      101,
      motion.scale(CLOSE_FRAMES),
      motion.entrance.easing,
    ),
    gap = matched ? mix(closure, 32, 18) : mix(closure, 32, 0);
  return (
    <g>
      {(["left", "right"] as const).map((side) => {
        const reach = side === "left" ? -gap : gap;
        return (
          <g key={side} data-review-latch={side}>
            <SketchedShape
              shape={{
                kind: "path",
                d: `M${480 + reach} 260 v36 h${-reach}`,
              }}
              profile={tokens.sketch.shape}
              stroke={matched ? accent : tokens.color.highlight}
              fill="none"
              strokeWidth={scales.stroke(LATCH_STROKE)}
            />
          </g>
        );
      })}
      <g opacity={closure}>
        <LabelSlots
          labels={[
            [
              matched ? input.labels.matched : input.labels.review,
              52,
              500,
              856,
              18,
              2,
            ],
          ]}
        />
      </g>
    </g>
  );
}
