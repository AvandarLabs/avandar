import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getVisibleReleaseIssueRowsFromInput } from "./getVisibleReleaseIssueRowsFromInput";
import type { Input } from "./ReleaseRepairObligations.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string; artifactX: number };
/**
 * Open follow-ups unfold into keyed owner and due entries without resolution.
 */
export function RepairRegister({
  input,
  frame,
  accent,
  artifactX,
}: Readonly<Props>): ReactNode {
  const followUps = getVisibleReleaseIssueRowsFromInput(input).filter(
    ({ issue }) => issue.state === "open" && issue.releaseRole === "follow-up",
  );
  return (
    <g>
      <g opacity={ramp(frame, 12, 12)}>
        <LabelSlots labels={[[input.labels.register, 60, 414, 840, 12, 2]]} />
      </g>
      {frame > 41
        ? followUps.map(({ issue, y, ordinal }, index) => {
            const x = 60 + index * 220;
            const sourceX = artifactX - (input.issueMarks === "tabs" ? 8 : 0);
            const sourceY = y - (input.issueMarks === "tabs" ? 0 : 12);
            const laneX = 16 + index * 8;
            const laneY = 420 + (followUps.length - 1 - index) * 3;
            const unfold = ramp(frame, 41 + index * 2, 43);
            return (
              <g key={issue.id} data-register-issue={issue.id} opacity={unfold}>
                <path
                  data-obligation-unfold={issue.id}
                  d={`M${sourceX} ${sourceY} H${laneX} V${laneY} H${x - 12} V431`}
                  fill="none"
                  stroke={accent}
                  strokeWidth={1.5}
                  strokeDasharray="4 6"
                  opacity={(1 - ramp(frame, 88, 3)) * unfold}
                />
                <circle
                  data-register-port={issue.id}
                  cx={x - 12}
                  cy={434}
                  r={3}
                  fill="none"
                  stroke={accent}
                />
                <path d={`M${x} 434 h200`} stroke={accent} />
                <text x={x - 12} y={452} fontSize={12} fill={STOCK.text}>
                  {ordinal}
                </text>
                <LabelSlots
                  labels={[
                    [issue.label, x, 452, 200, 12, 3],
                    [issue.owner, x, 500, 200, 12, 3],
                    [issue.dueLabel, x, 548, 200, 12, 3],
                  ]}
                />
              </g>
            );
          })
        : undefined}
    </g>
  );
}
