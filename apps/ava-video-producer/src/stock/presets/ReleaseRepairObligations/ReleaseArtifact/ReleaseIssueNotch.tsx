import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getVisibleReleaseIssueRowsFromInput } from "../getVisibleReleaseIssueRowsFromInput";
import type { Input } from "../ReleaseRepairObligations.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
  artifactX: number;
};

type Props = {
  accent: Readonly<ParentProps>["accent"];
  artifactX: Readonly<ParentProps>["artifactX"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  issue: ReturnType<
    typeof getVisibleReleaseIssueRowsFromInput
  >[number]["issue"];
  y: ReturnType<typeof getVisibleReleaseIssueRowsFromInput>[number]["y"];
};

/** Renders the release issue notch in authored paint order. */
export function ReleaseIssueNotch(options: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${options.artifactX} ${options.y - 12} l16 12 l-16 12`,
      }}
      profile={options.tokens.sketch.shape}
      data-issue-notch={options.issue.id}
      fill="none"
      stroke={
        options.issue.state === "open"
          ? options.tokens.color.highlight
          : options.accent
      }
      strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
    />
  );
}
