import { Arrive } from "../../../graphics-common/Arrive/Arrive";
import { StockRect } from "../../../primitives/StockRect";
import { ForkLabel } from "../ForkLabel/ForkLabel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props as BranchProps } from "../DecisionBranch";
import type { ReactNode } from "react";

type ParentProps = Pick<
  BranchProps,
  "branch" | "x" | "frame" | "index" | "accent" | "isSelected"
>;

type Props = {
  branch: Readonly<ParentProps>["branch"];
  x: Readonly<ParentProps>["x"];
  frame: Readonly<ParentProps>["frame"];
  index: Readonly<ParentProps>["index"];
  accent: Readonly<ParentProps>["accent"];
  style: ReturnType<
    typeof GraphicThemeHooks.useGraphicProps<
      "DecisionFork",
      Record<never, never>
    >
  >;
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  selected: number;
};

/** Renders the decision condition arrive in authored paint order. */
export function DecisionConditionArrive(options: Readonly<Props>): ReactNode {
  return (
    <Arrive frame={options.frame} at={20} index={options.index}>
      <StockRect
        x={options.x - 96}
        y={302}
        width={192}
        height={72}
        rx={options.scales.corner(options.style.conditionRadius)}
        fill={options.color.ground}
      />
      <ForkLabel text={options.branch.condition} x={options.x} y={321} />
      <StockRect
        x={options.x - 96}
        y={302}
        width={192}
        height={72}
        rx={options.scales.corner(options.style.conditionRadius)}
        fill="none"
        stroke={options.accent}
        strokeOpacity={options.selected}
        strokeWidth={options.scales.stroke(options.style.conditionStrokeWidth)}
      />
    </Arrive>
  );
}
