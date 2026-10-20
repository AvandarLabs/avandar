import { DUR, ramp } from "../../../motion";
import { STOCK } from "../../graphics-common";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { ForkLabel } from "./ForkLabel/ForkLabel";
import type { Props as BranchProps } from "./DecisionBranch";
import type { ReactNode } from "react";
type Props = Pick<
  BranchProps,
  "branch" | "x" | "frame" | "accent" | "isSelected" | "showUnchosenOutcomes"
>;

/**
 * The chosen outcome opens into the hold while alternatives may stay subdued.
 */
export function DecisionOutcome({
  branch,
  x,
  frame,
  accent,
  isSelected,
  showUnchosenOutcomes,
}: Readonly<Props>): ReactNode {
  const selected = isSelected ? ramp(frame, 46, DUR.sheet) : 0;
  const opacity = isSelected ? ramp(frame, 114, DUR.chip) : 1;
  if (!isSelected && !showUnchosenOutcomes) {
    return null;
  }
  return (
    <g opacity={opacity}>
      <StockRect
        x={x - 104}
        y={424}
        width={208}
        height={94}
        rx={14}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <StockRect
        x={x - 104}
        y={424}
        width={208}
        height={94}
        rx={14}
        fill="none"
        stroke={accent}
        strokeOpacity={selected}
      />
      <ForkLabel
        text={branch.outcome}
        x={x}
        y={449}
        width={184}
        fill={STOCK.text}
      />
    </g>
  );
}
