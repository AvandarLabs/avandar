import { DUR, ramp } from "../../../motion";
import { Arrive, STOCK } from "../../graphics-common";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { ForkLabel } from "./ForkLabel/ForkLabel";
import type { Props as BranchProps } from "./DecisionBranch";
import type { ReactNode } from "react";

type Props = Pick<
  BranchProps,
  "branch" | "x" | "frame" | "index" | "accent" | "isSelected"
>;

/**
 * Branch conditions remain readable while the selected condition gains focus.
 */
export function DecisionCondition({
  branch,
  x,
  frame,
  index,
  accent,
  isSelected,
}: Readonly<Props>): ReactNode {
  const selected = isSelected ? ramp(frame, 46, DUR.sheet) : 0;
  return (
    <Arrive frame={frame} at={20} index={index}>
      <StockRect
        x={x - 96}
        y={302}
        width={192}
        height={72}
        rx={10}
        fill={STOCK.ground}
      />
      <ForkLabel text={branch.condition} x={x} y={321} fill={STOCK.text} />
      <StockRect
        x={x - 96}
        y={302}
        width={192}
        height={72}
        rx={10}
        fill="none"
        stroke={accent}
        strokeOpacity={selected}
      />
    </Arrive>
  );
}
