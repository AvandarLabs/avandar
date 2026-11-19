import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getVisibleReleaseIssueRowsFromInput } from "./getVisibleReleaseIssueRowsFromInput";
import type { Input } from "./ReleaseRepairObligations.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; artifactX: number };
/** The guide artifact's corner, before the theme's corner style. */
const GUIDE_CORNER = 3;
/**
 * Stable issue identities and full limitations travel with the same artifact.
 */
export function ReleaseArtifact({
  input,
  frame,
  accent,
  artifactX,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const visibleIssues = getVisibleReleaseIssueRowsFromInput(input);
  return (
    <g opacity={motion.reveal(frame, 12)}>
      <StockRect
        data-release-artifact={input.artifact.kind}
        x={artifactX}
        y={100}
        width={300}
        height={298}
        rx={scales.corner(
          input.artifact.kind === "guide" ? GUIDE_CORNER : tokens.corner.panel,
        )}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        fill={tokens.color.surface}
      />
      <LabelSlots
        labels={[
          [input.artifact.label, artifactX + 20, 116, 260, 12, 3],
          [input.labels.limitations, artifactX + 20, 164, 260, 12, 3],
        ]}
      />
      {visibleIssues.map(({ issue, y, ordinal }) => {
        return (
          <g key={issue.id} data-attached-issue={issue.id}>
            {input.issueMarks === "tabs" ? (
              <StockRect
                data-issue-tab={issue.id}
                x={artifactX - 8}
                y={y - 12}
                width={25}
                height={24}
                rx={scales.corner(2)}
                fill={tokens.color.surface}
                stroke={
                  issue.state === "open" ? tokens.color.highlight : accent
                }
              />
            ) : (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${artifactX} ${y - 12} l16 12 l-16 12`,
                }}
                profile={tokens.sketch.shape}
                data-issue-notch={issue.id}
                fill="none"
                stroke={
                  issue.state === "open" ? tokens.color.highlight : accent
                }
                strokeWidth={scales.stroke(tokens.stroke.default)}
              />
            )}
            <text
              x={artifactX + 5}
              y={y + 4}
              textAnchor="middle"
              fontFamily={tokens.text.graphic.data.fontFamily}
              fontWeight={tokens.text.graphic.data.fontWeight}
              fontSize={tokens.text.graphic.data.fontSize}
              fill={tokens.text.graphic.data.color}
            >
              {ordinal}
            </text>
            <LabelSlots
              labels={[[issue.label, artifactX + 32, y, 248, 12, 3]]}
            />
            {issue.state === "resolved" ? (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${artifactX + 284} ${y - 4} l5 5 l9 -11`,
                }}
                profile={tokens.sketch.shape}
                data-resolved-mark={issue.id}
                stroke={accent}
                strokeWidth={scales.stroke(tokens.stroke.default)}
                fill="none"
              />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}
