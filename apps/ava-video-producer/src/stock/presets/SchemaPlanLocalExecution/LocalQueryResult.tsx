import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SchemaPlanLocalExecution.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/**
 * Exact equality membership and finite local sum stay beside the retained
 * table.
 */
export function LocalQueryResult({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const result = input.rows
    .filter(({ category }) => {
      return category === input.request.selectedCategory;
    })
    .reduce((sum, { value }) => {
      return sum + value;
    }, 0);
  return (
    <g>
      <LabelSlots
        labels={[[input.boundaryLabels.result, 360, 120, 190, 14, 4]]}
      />
      <text
        data-local-result={result}
        x={360}
        y={216}
        fill={accent}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontSize={tokens.text.graphic.data.fontSize}
        aria-label={String(result)}
      >
        {String(result)}
      </text>
      <text
        x={345}
        y={248}
        fill={accent}
        fontFamily={tokens.text.graphic.smallCaption.fontFamily}
        fontSize={tokens.text.graphic.smallCaption.fontSize}
      >
        {"="}
      </text>
      <LiteralDataText value={input.request.selectedCategory} x={360} y={248} />
    </g>
  );
}
