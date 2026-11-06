import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CategoryContext } from "./CategoryContext";
import { CategoryLabel } from "./CategoryLabel";
import type { Input } from "./ChartFocusEdit.schema";
import type { ReactNode } from "react";

type Props = {
  category: Input["categories"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
/**
 * An unchanging quantitative bar with independently moving editorial labels.
 */
export function ChartCategory({
  category,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const refinement = ramp(frame, 40, 72, EASE.inOut);
  const direct = input.treatment !== "focus" ? refinement : 0;
  const emphasized =
    input.treatment !== "direct-labels" && category.id !== input.focusId;
  const y = 174 + index * 72;
  return (
    <g opacity={ramp(frame, 12 + index * 2, 12)}>
      {input.showBeforeGuide ? (
        <path
          data-before-guide={category.id}
          d={`M20 ${y + 29}H332`}
          stroke={STOCK.line}
          strokeDasharray="3 5"
          opacity={refinement * 0.4}
        />
      ) : undefined}
      <g
        data-bar-emphasis={category.id}
        opacity={emphasized ? mix(refinement, 1, 0.35) : 1}
      >
        <rect
          data-chart-bar={category.id}
          x={344}
          y={y}
          width={(category.value / input.axisMaximum) * 400}
          height={20}
          rx={2}
          fill={accent}
        />
      </g>
      <CategoryLabel category={category} direct={direct} y={y} />
      <CategoryContext
        category={category}
        input={input}
        y={y}
        frame={frame}
        accent={accent}
      />
    </g>
  );
}
