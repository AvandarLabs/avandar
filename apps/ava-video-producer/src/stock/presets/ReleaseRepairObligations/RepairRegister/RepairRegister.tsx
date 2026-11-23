import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getVisibleReleaseIssueRowsFromInput } from "../getVisibleReleaseIssueRowsFromInput";
import { RepairRegisterRegisterIssue } from "./RepairRegisterRegisterIssue";
import type { Input } from "../ReleaseRepairObligations.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  artifactX: number;
};

/**
 * Open follow-ups unfold into keyed owner and due entries without resolution.
 */
export function RepairRegister({
  input,
  frame,
  accent,
  artifactX,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const followUps = getVisibleReleaseIssueRowsFromInput(input).filter(
    ({ issue }) => {
      return issue.state === "open" && issue.releaseRole === "follow-up";
    },
  );
  return (
    <g>
      <g opacity={motion.reveal(frame, 12)}>
        <LabelSlots labels={[[input.labels.register, 60, 414, 840, 12, 2]]} />
      </g>
      {frame > 41
        ? followUps.map(({ issue, y, ordinal }, index) => {
            const unfold = motion.ramp(
              frame,
              41 + index * motion.stagger.list,
              motion.scale(43),
            );
            return (
              <RepairRegisterRegisterIssue
                key={issue.id}
                input={input}
                frame={frame}
                accent={accent}
                artifactX={artifactX}
                motion={motion}
                followUps={followUps}
                issue={issue}
                y={y}
                ordinal={ordinal}
                index={index}
                unfold={unfold}
              />
            );
          })
        : undefined}
    </g>
  );
}
