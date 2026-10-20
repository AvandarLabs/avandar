import { EASE, ramp } from "../../../motion";
import { CleanupLaneHeading } from "./CleanupLaneHeading";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * The main lane is original at setup and prepared once replacement resolves.
 */
export function CleanupPrimaryHeading({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const refinement = ramp(frame, 40, 72, EASE.inOut);
  const bounds = { x: 88, y: 122, placement: "primary" as const };
  return (
    <g>
      <CleanupLaneHeading
        {...bounds}
        text={input.columnLabels.original}
        labelRole="original"
        opacity={1 - refinement}
      />
      <CleanupLaneHeading
        {...bounds}
        text={input.columnLabels.result}
        labelRole="result"
        opacity={refinement}
        color={accent}
      />
    </g>
  );
}
