import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const motion = useGraphicMotion();
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

type Point = Readonly<{ x: number; y: number }>;
type FollowUpIssue = ReturnType<
  typeof getVisibleReleaseIssueRowsFromInput
>[number]["issue"];

/** The dashed path a follow-up unfolds along, from its mark to the register. */
function ObligationUnfold({
  issueId,
  source,
  lane,
  x,
  opacity,
  accent,
}: Readonly<{
  issueId: string;
  source: Point;
  lane: Point;
  x: number;
  opacity: number;
  accent: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const { atomic } = useGraphicTheme();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${source.x} ${source.y} H${lane.x} V${lane.y} H${x - 12} V431`,
      }}
      profile={tokens.sketch.shape}
      data-obligation-unfold={issueId}
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.outline)}
      strokeDasharray={atomic.dash.spaced.join(" ")}
      opacity={opacity}
    />
  );
}

type RegisterEntryProps = Readonly<{
  issue: FollowUpIssue;
  ordinal: number;
  x: number;
  accent: string;
}>;

/** The follow-up's register entry: its port, number, owner, and due date. */
function RegisterEntry({
  issue,
  ordinal,
  x,
  accent,
}: RegisterEntryProps): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <>
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
        fontWeight={tokens.text.graphic.data.fontWeight}
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
    </>
  );
}
