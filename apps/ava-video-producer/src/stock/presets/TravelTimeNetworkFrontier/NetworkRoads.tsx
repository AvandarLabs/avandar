import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FrontierRoad } from "./FrontierRoad/FrontierRoad";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const nodes = getTravelCostsFromInput(input);
  const time =
    input.budgetMinutes *
    motion.ramp(frame, 46, motion.scale(64), motion.travel.easing);
  return (
    <g>
      {input.roads.map((road, index) => {
        return (
          <g
            key={road.id}
            opacity={motion.ramp(
              frame,
              13 + index * motion.stagger.list,
              motion.hero,
              motion.reveal.easing,
            )}
          >
            <FrontierRoad
              road={road}
              first={nodes.find(propEq("id", road.fromId))!}
              second={nodes.find(propEq("id", road.toId))!}
              time={time}
              accent={accent}
            />
          </g>
        );
      })}
    </g>
  );
}
