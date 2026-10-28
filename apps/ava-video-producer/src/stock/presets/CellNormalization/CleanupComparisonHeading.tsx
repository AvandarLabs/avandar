import { ramp } from "../../../motion";
import { CleanupLaneHeading } from "./CleanupLaneHeading";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/**
 * The right lane holds originals in a rail and edit explanations in ghost
 * mode.
 */
export function CleanupComparisonHeading({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const inline = input.comparison === "inline-ghost";
  if (inline && !input.showEditLabels) {
    return undefined;
  }
  return (
    <CleanupLaneHeading
      text={inline ? input.columnLabels.change : input.columnLabels.original}
      labelRole={inline ? "change" : "original"}
      placement={inline ? "edit" : "retained"}
      x={514}
      y={122}
      opacity={inline ? ramp(frame, 76, 36) : ramp(frame, 60, 52)}
    />
  );
}
