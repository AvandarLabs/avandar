import { EASE, mix, ramp } from "../../../motion";
import { cubicPoint } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import type { Props } from "./ExceptionDetour";
import type { ReactNode } from "react";
/**
 * One named marker approaches, pauses, and follows the curved exception route.
 */
export function ExceptionCase({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const approach = ramp(frame, 24, 24, EASE.inOut);
  const travel = ramp(frame, 60, 48, EASE.inOut);
  const targetY = input.detourSide === "above" ? 180 : 420;
  const point = cubicPoint(
    { x: 420, y: 300 },
    { x: 560, y: 300 },
    { x: 540, y: targetY },
    { x: 670, y: targetY },
    travel,
  );
  const x = frame < 60 ? mix(approach, 100, 420) : point.x;
  return (
    <g opacity={ramp(frame, 24, 12)} aria-label={input.caseLabel}>
      <circle data-moving-case="true" cx={x} cy={point.y} r={8} fill={accent} />
      <path
        d="M120 510 V500 H840 V510"
        stroke={accent}
        fill="none"
        opacity={ramp(frame, 108, 12)}
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
