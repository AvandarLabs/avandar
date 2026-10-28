import { ramp } from "../../../motion";
import { Text } from "../../graphics-common";
import { STOCK } from "../../stockPalette";
import type { getTravelCostsFromInput } from "./getTravelCostsFromInput";
import type { Input } from "./TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";
type Props = {
  node: ReturnType<typeof getTravelCostsFromInput>[number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
/** A fixed marker fills only when cumulative network time reaches its node. */
export function DestinationMarker({
  node,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const reached = node.cost <= input.budgetMinutes;
  const active = reached
    ? ramp(
        frame,
        node.cost === 0 ? 0 : 46 + (58 * node.cost) / input.budgetMinutes,
        6,
      )
    : 0;
  const center = { cx: 48 + node.x * 4, cy: 150 + node.y * 3.4 };
  return (
    <g>
      <circle
        data-reachable={reached}
        {...center}
        r={10}
        fill={STOCK.surface}
        stroke={reached ? accent : STOCK.orange}
        strokeWidth={2}
      />
      <circle {...center} r={7} fill={accent} fillOpacity={active} />
      <Text x={center.cx} y={center.cy + 4} size={12} anchor="middle">
        {index + 1}
      </Text>
    </g>
  );
}
