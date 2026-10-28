import { ramp } from "../../../motion";
import { Text } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/**
 * Authored road identities and minute costs occupy a separate readable rail.
 */
export function NetworkCosts({ input, frame }: Readonly<Props>): ReactNode {
  return input.showCosts ? (
    <g>
      {input.roads.map((road, index) => (
        <g key={road.id} opacity={ramp(frame, 13 + index * 2, 18)}>
          <LabelSlots
            labels={[
              [
                road.id,
                40 + (index % 4) * 220,
                532 + Math.floor(index / 4) * 32,
                155,
                12,
                2,
              ],
            ]}
          />
          <Text
            x={238 + (index % 4) * 220}
            y={532 + Math.floor(index / 4) * 32}
            size={12}
            anchor="end"
          >
            {road.minutes}
          </Text>
        </g>
      ))}
    </g>
  ) : undefined;
}
