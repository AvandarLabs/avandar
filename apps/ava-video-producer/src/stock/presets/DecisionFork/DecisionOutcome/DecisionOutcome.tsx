import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ForkLabel } from "../ForkLabel/ForkLabel";
import { OutcomeCard } from "./OutcomeCard";
import type { Props as BranchProps } from "../DecisionBranch";
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
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const selected = isSelected
    ? Motion.ramp({
        frame,
        at: SELECTION_CUE,
        dur: motion.sheet,
        easing: motion.reveal.easing,
      })
    : 0;
  const opacity = isSelected
    ? Motion.ramp({
        frame,
        at: HOLD_CUE,
        dur: motion.chip,
        easing: motion.reveal.easing,
      })
    : 1;
  if (!isSelected && !showUnchosenOutcomes) {
    return null;
  }
  return (
    <g opacity={opacity}>
      <OutcomeCard x={x} fill={color.surface} stroke={color.line} />
      <OutcomeCard x={x} fill="none" stroke={accent} strokeOpacity={selected} />
      <ForkLabel text={branch.outcome} x={x} y={449} width={184} />
    </g>
  );
}
