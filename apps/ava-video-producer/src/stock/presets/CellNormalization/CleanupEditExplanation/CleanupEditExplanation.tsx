import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CleanupLaneHeading } from "../CleanupLaneHeading";
import { EXPLANATION_CUE, EXPLANATION_FRAMES } from "../cleanupTiming";
import { type Props } from "./CleanupEditExplanationShared.types";
import { EditValue } from "./EditValue";
import type { ReactNode } from "react";
/** Authored edit explanations stay beneath their per-row or column label. */
export function CleanupEditExplanation({
  row,
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  if (!input.showEditLabels) {
    return undefined;
  }
  const inline = input.comparison === "inline-ghost";
  return (
    <g
      data-edit-explanation={row.id}
      opacity={Motion.ramp({
        frame,
        at: EXPLANATION_CUE,
        dur: motion.scale(EXPLANATION_FRAMES),
        easing: motion.reveal.easing,
      })}
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
