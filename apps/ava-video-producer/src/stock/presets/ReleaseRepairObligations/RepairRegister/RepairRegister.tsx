import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getVisibleReleaseIssueRowsFromInput } from "../getVisibleReleaseIssueRowsFromInput";
import { ObligationUnfold } from "./ObligationUnfold";
import { RegisterEntry } from "./RegisterEntry";
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
              <g key={issue.id} data-register-issue={issue.id} opacity={unfold}>
                <ObligationUnfold
                  issueId={issue.id}
                  source={{
                    x: artifactX - (input.issueMarks === "tabs" ? 8 : 0),
                    y: y - (input.issueMarks === "tabs" ? 0 : 12),
                  }}
                  lane={{
                    x: 16 + index * 8,
                    y: 420 + (followUps.length - 1 - index) * 3,
                  }}
                  x={60 + index * 220}
                  opacity={
                    (1 - motion.ramp(frame, 88, motion.scale(3))) * unfold
                  }
                  accent={accent}
                />
                <RegisterEntry
                  issue={issue}
                  ordinal={ordinal}
                  x={60 + index * 220}
                  accent={accent}
                />
              </g>
            );
          })
        : undefined}
    </g>
  );
}
