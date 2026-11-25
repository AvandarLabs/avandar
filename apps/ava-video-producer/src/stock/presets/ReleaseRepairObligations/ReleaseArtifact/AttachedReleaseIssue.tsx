import { ReleaseIssueCaptionAndResolution } from "./ReleaseIssueCaptionAndResolution";
import { ReleaseIssueNotch } from "./ReleaseIssueNotch";
import { ReleaseIssueOrdinal } from "./ReleaseIssueOrdinal";
import { ReleaseIssueTab } from "./ReleaseIssueTab";
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
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  artifactX: Readonly<ParentProps>["artifactX"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  issue: ReturnType<
    typeof getVisibleReleaseIssueRowsFromInput
  >[number]["issue"];
  y: ReturnType<typeof getVisibleReleaseIssueRowsFromInput>[number]["y"];
  ordinal: ReturnType<
    typeof getVisibleReleaseIssueRowsFromInput
  >[number]["ordinal"];
};

/** Renders the attached release issue in authored paint order. */
export function AttachedReleaseIssue(options: Readonly<Props>): ReactNode {
  return (
    <g key={options.issue.id} data-attached-issue={options.issue.id}>
      {options.input.issueMarks === "tabs" ? (
        <ReleaseIssueTab {...options} />
      ) : (
        <ReleaseIssueNotch {...options} />
      )}
      <ReleaseIssueOrdinal {...options} />
      <ReleaseIssueCaptionAndResolution {...options} />
    </g>
  );
}
