import { ramp } from "../../../motion";
import { Arrive } from "../../graphics-common";
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
  const style = useGraphicProps("DecisionFork", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const selected = isSelected ? ramp(frame, SELECTION_CUE, motion.sheet) : 0;
  return (
    <Arrive frame={frame} at={20} index={index}>
      <StockRect
        x={x - 96}
        y={302}
        width={192}
        height={72}
        rx={style.conditionRadius}
        fill={color.ground}
      />
      <ForkLabel text={branch.condition} x={x} y={321} />
      <StockRect
        x={x - 96}
        y={302}
        width={192}
        height={72}
        rx={style.conditionRadius}
        fill="none"
        stroke={accent}
        strokeOpacity={selected}
        strokeWidth={style.conditionStrokeWidth}
      />
    </Arrive>
  );
}
