import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { OUTCOME_CUE } from "../outboxShape";
import { OutboxCommitMarksShared } from "./OutboxCommitMarksShared";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
};
/** A commit stamp under each store, growing on the outcome cue. */
export function CommitStamps({ frame, accent }: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const radius =
    9 *
    Motion.ramp({
      frame,
      at: OUTCOME_CUE,
      dur: motion.scale(OutboxCommitMarksShared.STAMP_FRAMES),
      easing: motion.entrance.easing,
    });
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
