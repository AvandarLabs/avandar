import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { CleanupLaneHeading } from "./CleanupLaneHeading";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";

type Props = { row: Input["rows"][number]; input: Input; frame: number };
/** Authored edit explanations stay beneath their per-row or column label. */
export function CleanupEditExplanation({
  row,
  input,
  frame,
}: Readonly<Props>): ReactNode {
  if (!input.showEditLabels) {
    return undefined;
  }
  const inline = input.comparison === "inline-ghost";
  return (
    <g data-edit-explanation={row.id} opacity={ramp(frame, 76, 36)}>
      {inline ? undefined : (
        <CleanupLaneHeading
          text={input.columnLabels.change}
          labelRole="change"
          placement="edit"
          x={88}
          y={42}
          fontSize={12}
        />
      )}
      <g data-edit-value={row.id}>
        <FitText
          text={row.editLabel}
          x={inline ? 514 : 88}
          y={inline ? 22 : 62}
          width={352}
          fontSize={12}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
          color={STOCK.muted}
        />
      </g>
    </g>
  );
}
