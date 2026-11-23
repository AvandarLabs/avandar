import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getVisibleReleaseIssueRowsFromInput } from "../getVisibleReleaseIssueRowsFromInput";
import { AttachedReleaseIssue } from "./AttachedReleaseIssue";
import { ReleaseArtifactSurface } from "./ReleaseArtifactSurface";
import type { Input } from "../ReleaseRepairObligations.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  artifactX: number;
};

/**
 * Stable issue identities and full limitations travel with the same artifact.
 */
export function ReleaseArtifact({
  input,
  frame,
  accent,
  artifactX,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const visibleIssues = getVisibleReleaseIssueRowsFromInput(input);
  return (
    <g opacity={motion.reveal(frame, 12)}>
      <ReleaseArtifactSurface
        input={input}
        accent={accent}
        artifactX={artifactX}
        tokens={tokens}
        scales={scales}
      />
      {visibleIssues.map(({ issue, y, ordinal }) => {
        return (
          <AttachedReleaseIssue
            key={issue.id}
            input={input}
            accent={accent}
            artifactX={artifactX}
            tokens={tokens}
            scales={scales}
            issue={issue}
            y={y}
            ordinal={ordinal}
          />
        );
      })}
    </g>
  );
}
