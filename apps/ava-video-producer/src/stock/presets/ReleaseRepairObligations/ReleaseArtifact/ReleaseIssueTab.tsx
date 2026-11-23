import { StockRect } from "../../../primitives/StockRect";
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

/** Renders the release issue tab in authored paint order. */
export function ReleaseIssueTab(options: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-issue-tab={options.issue.id}
      x={options.artifactX - 8}
      y={options.y - 12}
      width={25}
      height={24}
      rx={options.scales.corner(2)}
      fill={options.tokens.color.surface}
      stroke={
        options.issue.state === "open"
          ? options.tokens.color.highlight
          : options.accent
      }
    />
  );
}
