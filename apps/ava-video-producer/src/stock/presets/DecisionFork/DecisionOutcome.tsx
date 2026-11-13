import { ramp } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme";
import { ForkLabel } from "./ForkLabel/ForkLabel";
import type { Props as BranchProps } from "./DecisionBranch";
import type { ReactNode } from "react";

type Props = Pick<
  BranchProps,
  "branch" | "x" | "frame" | "accent" | "isSelected" | "showUnchosenOutcomes"
>;

const SELECTION_CUE = 46;
const HOLD_CUE = 114;

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
  const style = useGraphicProps("DecisionFork", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const selected = isSelected ? ramp(frame, SELECTION_CUE, motion.sheet) : 0;
  const opacity = isSelected ? ramp(frame, HOLD_CUE, motion.chip) : 1;
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
        rx={style.outcomeRadius}
        fill={color.surface}
        stroke={color.line}
        strokeWidth={style.outcomeStrokeWidth}
      />
      <StockRect
        x={x - 104}
        y={424}
        width={208}
        height={94}
        rx={style.outcomeRadius}
        fill="none"
        stroke={accent}
        strokeOpacity={selected}
        strokeWidth={style.outcomeStrokeWidth}
      />
      <ForkLabel text={branch.outcome} x={x} y={449} width={184} />
    </g>
  );
}
