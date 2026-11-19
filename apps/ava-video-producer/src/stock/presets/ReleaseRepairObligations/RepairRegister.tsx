import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getVisibleReleaseIssueRowsFromInput } from "./getVisibleReleaseIssueRowsFromInput";
import type { Input } from "./ReleaseRepairObligations.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; artifactX: number };
/** The dash of an obligation unfolding into the register. */
const OBLIGATION_DASH = "4 6";
/**
 * Open follow-ups unfold into keyed owner and due entries without resolution.
 */
export function RepairRegister({
  input,
  frame,
  accent,
  artifactX,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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
            const x = 60 + index * 220;
            const sourceX = artifactX - (input.issueMarks === "tabs" ? 8 : 0);
            const sourceY = y - (input.issueMarks === "tabs" ? 0 : 12);
            const laneX = 16 + index * 8;
            const laneY = 420 + (followUps.length - 1 - index) * 3;
            const unfold = motion.ramp(
              frame,
              41 + index * motion.stagger.list,
              motion.scale(43),
            );
            return (
              <g key={issue.id} data-register-issue={issue.id} opacity={unfold}>
                <SketchedShape
                  shape={{
                    kind: "path",
                    d: `M${sourceX} ${sourceY} H${laneX} V${laneY} H${x - 12} V431`,
                  }}
                  profile={tokens.sketch.shape}
                  data-obligation-unfold={issue.id}
                  fill="none"
                  stroke={accent}
                  strokeWidth={scales.stroke(tokens.stroke.outline)}
                  strokeDasharray={OBLIGATION_DASH}
                  opacity={
                    (1 - motion.ramp(frame, 88, motion.scale(3))) * unfold
                  }
                />
                <SketchedShape
                  shape={{ kind: "circle", cx: x - 12, cy: 434, r: 3 }}
                  profile={tokens.sketch.shape}
                  data-register-port={issue.id}
                  fill="none"
                  stroke={accent}
                />
                <SketchedShape
                  shape={{ kind: "path", d: `M${x} 434 h200` }}
                  profile={tokens.sketch.shape}
                  stroke={accent}
                />
                <text
                  x={x - 12}
                  y={452}
                  fontFamily={tokens.text.graphic.data.fontFamily}
                  fontSize={tokens.text.graphic.data.fontSize}
                  fill={tokens.text.graphic.data.color}
                >
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
