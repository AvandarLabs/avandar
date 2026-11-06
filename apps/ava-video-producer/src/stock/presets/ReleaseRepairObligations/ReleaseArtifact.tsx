import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getVisibleReleaseIssueRowsFromInput } from "./getVisibleReleaseIssueRowsFromInput";
import type { Input } from "./ReleaseRepairObligations.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; artifactX: number };
/**
 * Stable issue identities and full limitations travel with the same artifact.
 */
export function ReleaseArtifact({
  input,
  frame,
  accent,
  artifactX,
}: Readonly<Props>): ReactNode {
  const visibleIssues = getVisibleReleaseIssueRowsFromInput(input);
  return (
    <g opacity={ramp(frame, 12, 12)}>
      <rect
        data-release-artifact={input.artifact.kind}
        x={artifactX}
        y={100}
        width={300}
        height={298}
        rx={input.artifact.kind === "guide" ? 3 : 18}
        stroke={accent}
        strokeWidth={2}
        fill={STOCK.surface}
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
              <rect
                data-issue-tab={issue.id}
                x={artifactX - 8}
                y={y - 12}
                width={25}
                height={24}
                rx={2}
                fill={STOCK.surface}
                stroke={issue.state === "open" ? STOCK.orange : accent}
              />
            ) : (
              <path
                data-issue-notch={issue.id}
                d={`M${artifactX} ${y - 12} l16 12 l-16 12`}
                fill="none"
                stroke={issue.state === "open" ? STOCK.orange : accent}
                strokeWidth={2}
              />
            )}
            <text
              x={artifactX + 5}
              y={y + 4}
              textAnchor="middle"
              fontSize={12}
              fill={STOCK.text}
            >
              {ordinal}
            </text>
            <LabelSlots
              labels={[[issue.label, artifactX + 32, y, 248, 12, 3]]}
            />
            {issue.state === "resolved" ? (
              <path
                data-resolved-mark={issue.id}
                d={`M${artifactX + 284} ${y - 4} l5 5 l9 -11`}
                stroke={accent}
                strokeWidth={2}
                fill="none"
              />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}
