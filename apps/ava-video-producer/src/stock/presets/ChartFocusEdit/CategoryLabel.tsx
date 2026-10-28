import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./ChartFocusEdit.schema";
import type { ReactNode } from "react";
type Props = {
  category: Input["categories"][number];
  direct: number;
  y: number;
};
/** A fixed text slot moves intact into a direct reading position. */
export function CategoryLabel({
  category,
  direct,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-category-label={category.id}
      transform={`translate(${mix(direct, 20, 156)} ${y + 15})`}
    >
      <FitText
        text={category.label}
        x={0}
        y={0}
        width={176}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
