import { Text } from "../../graphics-common/Text";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * Authored road identities and minute costs occupy a separate readable rail.
 */
export function NetworkCosts({ input, frame }: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return input.showCosts ? (
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
              role="data"
              anchor="end"
            >
              {road.minutes}
            </Text>
          </g>
        );
      })}
    </g>
  ) : undefined;
}
