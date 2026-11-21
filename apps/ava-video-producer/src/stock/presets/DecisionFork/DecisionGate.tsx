import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props as BranchProps } from "./DecisionBranch";
import type { ReactNode } from "react";

type Props = Pick<BranchProps, "branch" | "x" | "frame" | "isSelected">;
const CLOSE_CUE = 60;
/** Untaken alternatives close gently before the marker leaves the junction. */
export function DecisionGate({
  branch,
  x,
  frame,
  isSelected,
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "DecisionFork",
    props: {},
  });
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const closed = isSelected
    ? 0
    : Motion.ramp({
        frame,
        at: CLOSE_CUE,
        dur: motion.sheet,
        easing: motion.reveal.easing,
      });
  const spread = Motion.mix({
    t: closed,
    from: 0,
    to: style.gateSpread,
  });
  return (
    <g
      opacity={closed}
      stroke={color.inactive}
      strokeWidth={scales.stroke(style.gateWidth)}
      data-closed-gate={branch.id}
    >
      <path
        d={`M${x - spread} 382 L${x + spread} 400 M${x + spread} 382 L${x - spread} 400`}
      />
    </g>
  );
}
