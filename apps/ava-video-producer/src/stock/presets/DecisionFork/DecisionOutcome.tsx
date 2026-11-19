import { ramp } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const scales = useGraphicShapeScales();
  const selected = isSelected
    ? ramp(frame, SELECTION_CUE, motion.sheet, motion.reveal.easing)
    : 0;
  const opacity = isSelected
    ? ramp(frame, HOLD_CUE, motion.chip, motion.reveal.easing)
    : 1;
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
        rx={scales.corner(style.outcomeRadius)}
        fill={color.surface}
        stroke={color.line}
        strokeWidth={scales.stroke(style.outcomeStrokeWidth)}
      />
      <StockRect
        x={x - 104}
        y={424}
        width={208}
        height={94}
        rx={scales.corner(style.outcomeRadius)}
        fill="none"
        stroke={accent}
        strokeOpacity={selected}
        strokeWidth={scales.stroke(style.outcomeStrokeWidth)}
      />
      <ForkLabel text={branch.outcome} x={x} y={449} width={184} />
    </g>
  );
}
