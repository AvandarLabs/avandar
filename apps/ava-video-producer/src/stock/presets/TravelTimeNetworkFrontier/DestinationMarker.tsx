import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const reached = node.cost <= input.budgetMinutes;
  const active = reached
    ? motion.ramp(
        frame,
        node.cost === 0 ? 0 : 46 + (58 * node.cost) / input.budgetMinutes,
        motion.chip,
        motion.entrance.easing,
      )
    : 0;
  const center = { cx: 48 + node.x * 4, cy: 150 + node.y * 3.4 };
  return (
    <g>
      <g data-reachable={reached}>
        <SketchedShape
          shape={{ kind: "circle", ...center, r: 10 }}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={reached ? accent : tokens.color.highlight}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      </g>
      <circle {...center} r={7} fill={accent} fillOpacity={active} />
      <Text x={center.cx} y={center.cy + 4} role="data" anchor="middle">
        {index + 1}
      </Text>
    </g>
  );
}
