import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ExceptionCondition } from "./ExceptionCondition";
import { ExceptionOutcome } from "./ExceptionOutcome";
import type { Props } from "./ExceptionDetour";
import type { ReactNode } from "react";
/**
 * The exception's condition and outcome remain separate from the normal rule.
 */
export function ExceptionRoute({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const targetY = input.detourSide === "above" ? 180 : 420;
  const reveal = ramp(frame, 48, 18);
  const path = `M420 300 C560 300 540 ${targetY} 670 ${targetY}`;
  return (
    <g opacity={reveal}>
      <path
        data-exception-route="true"
        d={path}
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - ramp(frame, 60, 48)}
      />
      <ExceptionCondition {...{ input, targetY }} />
      <ExceptionOutcome {...{ input, targetY, accent }} />
      <path
        data-resolved-bracket="true"
        opacity={ramp(frame, 108, 12)}
        d={`M92 ${targetY - 36} h-12 v114 h12 M922 ${targetY - 36} h12 v114 h-12 M80 516 v62 h854 v-62`}
        stroke={STOCK.orange}
        fill="none"
      />
    </g>
  );
}
