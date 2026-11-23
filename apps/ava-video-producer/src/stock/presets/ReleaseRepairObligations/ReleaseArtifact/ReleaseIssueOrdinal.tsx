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
  artifactX: Readonly<ParentProps>["artifactX"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  y: ReturnType<typeof getVisibleReleaseIssueRowsFromInput>[number]["y"];
  ordinal: ReturnType<
    typeof getVisibleReleaseIssueRowsFromInput
  >[number]["ordinal"];
};

/** Renders the release artifacttext in authored paint order. */
export function ReleaseIssueOrdinal(options: Readonly<Props>): ReactNode {
  return (
    <text
      x={options.artifactX + 5}
      y={options.y + 4}
      textAnchor="middle"
      fontFamily={options.tokens.text.graphic.data.fontFamily}
      fontWeight={options.tokens.text.graphic.data.fontWeight}
      fontSize={options.tokens.text.graphic.data.fontSize}
      fill={options.tokens.text.graphic.data.color}
    >
      {options.ordinal}
    </text>
  );
}
