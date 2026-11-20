import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CleanupLaneHeading } from "./CleanupLaneHeading";
import { EXPLANATION_CUE, EXPLANATION_FRAMES } from "./cleanupTiming";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";

type Props = { row: Input["rows"][number]; input: Input; frame: number };
/** Authored edit explanations stay beneath their per-row or column label. */
export function CleanupEditExplanation({
  row,
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  if (!input.showEditLabels) {
    return undefined;
  }
  const inline = input.comparison === "inline-ghost";
  return (
    <g
      data-edit-explanation={row.id}
      opacity={ramp(
        frame,
        EXPLANATION_CUE,
        motion.scale(EXPLANATION_FRAMES),
        motion.reveal.easing,
      )}
    >
      {inline ? undefined : (
        <CleanupLaneHeading
          text={input.columnLabels.change}
          labelRole="change"
          placement="edit"
          x={88}
          y={42}
          isSublabel
        />
      )}
      <EditValue row={row} isInline={inline} />
    </g>
  );
}

/** The row's edit explanation, inline beside the ghost or under its lane. */
function EditValue({
  row,
  isInline,
}: Readonly<{ row: Props["row"]; isInline: boolean }>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g data-edit-value={row.id}>
      <FitText
        text={row.editLabel}
        x={isInline ? 514 : 88}
        y={isInline ? 22 : 62}
        width={352}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={tokens.color.textMuted}
      />
    </g>
  );
}
