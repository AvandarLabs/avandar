import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { CategoryContextHeading } from "./CategoryContextHeading";
import { VALUE_FONT_SIZE } from "./chartShape";
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
          fill={tokens.color.text}
          fontSize={VALUE_FONT_SIZE}
          fontFamily={tokens.text.graphic.data.fontFamily}
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
