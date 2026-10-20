import { StockRect } from "../../primitives/StockRect/StockRect";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getSpineContributionFromFrame } from "./getSpineContributionFromFrame";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  observation: Input["observations"][number];
  index: number;
  frame: number;
  accent: string;
};
/** A complete numeric value travels from its source into its entity stack. */
export function SpineContribution({
  input,
  observation,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, opacity } = getSpineContributionFromFrame({
    input,
    observation,
    index,
    frame,
  });
  return (
    <g data-spine-contribution={observation.id} opacity={opacity}>
      <StockRect
        data-contribution-body={observation.id}
        x={x - 3}
        y={y - 14}
        width={222}
        height={18}
        rx={3}
        fill={STOCK.elevated}
        stroke={accent}
      />
      <LabelSlots labels={[[String(observation.value), x, y, 216, 12, 1]]} />
    </g>
  );
}
