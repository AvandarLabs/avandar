import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
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
  const isRetesting =
    frame >= 88 && frame <= 108 && input.testResults.after !== "not-tested";
  const isInitial = frame >= 10 && frame <= 30;
  const reach = isRetesting ? ramp(frame, 88, 8) : ramp(frame, 10, 10);
  const replacement = ramp(frame, 56, 22);
  return (
    <g>
      {isInitial || isRetesting ? (
        <path
          data-operation={isRetesting ? "retest" : "initial-test"}
          data-actor="participant"
          d={`M200 310 L${mix(reach, 220, 560)} ${mix(reach, 325, 330)}`}
          fill="none"
          stroke={accent}
          strokeWidth={5}
          strokeLinecap="round"
        />
      ) : undefined}
      {frame >= 44 && frame <= 78 ? (
        <path
          data-repair-hand="worker"
          d={`M760 310 L${mix(replacement, 742, 562)} ${mix(replacement, 374, 330)}`}
          fill="none"
          stroke={STOCK.cyan}
          strokeWidth={5}
          strokeLinecap="round"
        />
      ) : undefined}
      <ComplaintPlacement frame={frame} input={input} accent={accent} />
    </g>
  );
}
