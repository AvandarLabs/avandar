import { ObligationUnfold } from "./ObligationUnfold";
import { RegisterEntry } from "./RegisterEntry";
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
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  artifactX: Readonly<ParentProps>["artifactX"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  followUps: ReturnType<typeof getVisibleReleaseIssueRowsFromInput>;
  issue: ReturnType<
    typeof getVisibleReleaseIssueRowsFromInput
  >[number]["issue"];
  y: ReturnType<typeof getVisibleReleaseIssueRowsFromInput>[number]["y"];
  ordinal: ReturnType<
    typeof getVisibleReleaseIssueRowsFromInput
  >[number]["ordinal"];
  index: number;
  unfold: number;
};

/** Renders the repair register register issue in authored paint order. */
export function RepairRegisterRegisterIssue(
  options: Readonly<Props>,
): ReactNode {
  return (
    <g
      key={options.issue.id}
      data-register-issue={options.issue.id}
      opacity={options.unfold}
    >
      <ObligationUnfold
        issueId={options.issue.id}
        source={{
          x: options.artifactX - (options.input.issueMarks === "tabs" ? 8 : 0),
          y: options.y - (options.input.issueMarks === "tabs" ? 0 : 12),
        }}
        lane={{
          x: 16 + options.index * 8,
          y: 420 + (options.followUps.length - 1 - options.index) * 3,
        }}
        x={60 + options.index * 220}
        opacity={
          (1 -
            options.motion.ramp(options.frame, 88, options.motion.scale(3))) *
          options.unfold
        }
        accent={options.accent}
      />
      <RegisterEntry
        issue={options.issue}
        ordinal={options.ordinal}
        x={60 + options.index * 220}
        accent={options.accent}
      />
    </g>
  );
}
