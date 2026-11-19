import { mix, ramp } from "../../../motion";
import { cubicPoint } from "../../graphics-common/cubicPoint";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DETOUR_CUE, DETOUR_FRAMES, RESOLVED_CUE } from "./exceptionTiming";
import type { Props } from "./ExceptionDetour";
import type { ReactNode } from "react";
/** Frames the case takes to approach the rule. */
const APPROACH_FRAMES = 24;

/**
 * One named marker approaches, pauses, and follows the curved exception route.
 */
export function ExceptionCase({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const approach = ramp(
    frame,
    24,
    motion.scale(APPROACH_FRAMES),
    motion.travel.easing,
  );
  const travel = ramp(
    frame,
    DETOUR_CUE,
    motion.scale(DETOUR_FRAMES),
    motion.travel.easing,
  );
  const targetY = input.detourSide === "above" ? 180 : 420;
  const point = cubicPoint(
    { x: 420, y: 300 },
    { x: 560, y: 300 },
    { x: 540, y: targetY },
    { x: 670, y: targetY },
    travel,
  );
  const x = frame < DETOUR_CUE ? mix(approach, 100, 420) : point.x;
  return (
    <g opacity={motion.reveal(frame, 24)} aria-label={input.caseLabel}>
      <circle data-moving-case="true" cx={x} cy={point.y} r={8} fill={accent} />
      <SketchedShape
        shape={{ kind: "path", d: "M120 510 V500 H840 V510" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        fill="none"
        opacity={motion.reveal(frame, RESOLVED_CUE)}
      />
      <FitText
        text={input.caseLabel}
        x={480}
        y={546}
        width={820}
        fontSize={18}
        maxLines={2}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
