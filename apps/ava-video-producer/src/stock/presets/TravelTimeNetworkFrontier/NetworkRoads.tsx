import { propEq } from "@avandar/utils";
import { EASE, ramp } from "../../../motion";
import { FrontierRoad } from "./FrontierRoad";
import { getTravelCostsFromInput } from "./getTravelCostsFromInput";
import type { Input } from "./TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Network time advances independently along both ends of every road. */
export function NetworkRoads({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const nodes = getTravelCostsFromInput(input);
  const time = input.budgetMinutes * ramp(frame, 46, 64, EASE.inOut);
  return (
    <g>
      {input.roads.map((road, index) => (
        <g key={road.id} opacity={ramp(frame, 13 + index * 2, 18)}>
          <FrontierRoad
            road={road}
            first={nodes.find(propEq("id", road.fromId))!}
            second={nodes.find(propEq("id", road.toId))!}
            time={time}
            accent={accent}
          />
        </g>
      ))}
    </g>
  );
}
