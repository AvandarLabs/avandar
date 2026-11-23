import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DecisionConditionArrive } from "./DecisionConditionArrive";
import type { Props as BranchProps } from "../DecisionBranch";
import type { ReactNode } from "react";

type Props = Pick<
  BranchProps,
  "branch" | "x" | "frame" | "index" | "accent" | "isSelected"
>;

const SELECTION_CUE = 46;

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
  const style = GraphicThemeHooks.useGraphicProps({
    name: "DecisionFork",
    props: {},
  });
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const selected = isSelected
    ? Motion.ramp({
        frame,
        at: SELECTION_CUE,
        dur: motion.sheet,
        easing: motion.reveal.easing,
      })
    : 0;
  return (
    <DecisionConditionArrive
      branch={branch}
      x={x}
      frame={frame}
      index={index}
      accent={accent}
      style={style}
      color={color}
      scales={scales}
      selected={selected}
    />
  );
}
