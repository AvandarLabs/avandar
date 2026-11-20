import { ramp } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { OUTCOME_CUE } from "../outboxShape";
import { OutboxCommitMarksShared } from "./OutboxCommitMarksShared/OutboxCommitMarksShared";
import type { ReactNode } from "react";
/** A commit stamp under each store, growing on the outcome cue. */
export function CommitStamps({
  frame,
  accent,
}: Readonly<{ frame: number; accent: string }>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const radius =
    9 *
    ramp(
      frame,
      OUTCOME_CUE,
      motion.scale(OutboxCommitMarksShared.STAMP_FRAMES),
      motion.entrance.easing,
    );
  return [400, 840].map((x) => {
    return (
      <circle
        key={x}
        data-commit-stamp={x}
        cx={x}
        cy={490}
        r={radius}
        fill={accent}
      />
    );
  });
}
