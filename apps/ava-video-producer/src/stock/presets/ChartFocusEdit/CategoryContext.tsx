import { STOCK } from "../../stockPalette";
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
  return (
    <g>
      {input.showValueLabels ? (
        <text
          data-value-label={category.id}
          x={884}
          y={y + 15}
          fill={STOCK.text}
          fontSize={14}
          fontFamily="Arial, sans-serif"
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
