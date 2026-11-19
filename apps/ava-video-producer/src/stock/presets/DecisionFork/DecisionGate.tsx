import { mix, ramp } from "../../../motion";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const style = useGraphicProps("DecisionFork", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const closed = isSelected
    ? 0
    : ramp(frame, CLOSE_CUE, motion.sheet, motion.reveal.easing);
  const spread = mix(closed, 0, style.gateSpread);
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
