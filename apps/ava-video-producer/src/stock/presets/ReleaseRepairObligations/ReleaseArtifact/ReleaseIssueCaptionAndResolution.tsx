import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
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

/** Renders the release issue caption and resolution in authored paint order. */
export function ReleaseIssueCaptionAndResolution(
  options: Readonly<Props>,
): ReactNode {
  return (
    <>
      <LabelSlots
        labels={[
          [options.issue.label, options.artifactX + 32, options.y, 248, 12, 3],
        ]}
      />
      {options.issue.state === "resolved" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${options.artifactX + 284} ${options.y - 4} l5 5 l9 -11`,
          }}
          profile={options.tokens.sketch.shape}
          data-resolved-mark={options.issue.id}
          stroke={options.accent}
          strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
          fill="none"
        />
      ) : undefined}
    </>
  );
}
