import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { CategoryContextHeading } from "./CategoryContextHeading";
import type { Input } from "./ChartFocusEdit.schema";
import type { ReactNode } from "react";

type Props = {
  category: Input["categories"][number];
  input: Input;
  y: number;
  frame: number;
  accent: string;
};
/** Optional values remain numeric data. Focus captions remain authored copy. */
export function CategoryContext({
  category,
  input,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {input.showValueLabels ? (
        <text
          data-value-label={category.id}
          x={884}
          y={y + 15}
          fill={tokens.text.graphic.value.color}
          fontSize={tokens.text.graphic.value.fontSize}
          fontFamily={tokens.text.graphic.value.fontFamily}
          fontWeight={tokens.text.graphic.value.fontWeight}
          textAnchor="end"
        >
          {category.value}
        </text>
      ) : undefined}
      <CategoryContextHeading
        category={category}
        input={input}
        y={y}
        frame={frame}
        accent={accent}
      />
    </g>
  );
}
