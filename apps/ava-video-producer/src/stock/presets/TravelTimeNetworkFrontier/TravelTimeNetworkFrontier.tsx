import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { NetworkCosts } from "./NetworkCosts";
import { NetworkDestinations } from "./NetworkDestinations";
import { NetworkRoads } from "./NetworkRoads";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Weighted schematic network reachability, independent of visual distance. */
export function TravelTimeNetworkFrontier({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const minutes = stockI18n._({
    id: "motionAtlas.travel-time-network-frontier.minutes",
    message: "minutes",
  });
  return (
    <g>
      <NetworkRoads input={input} frame={frame} accent={accent} />
      <NetworkDestinations input={input} frame={frame} accent={accent} />
      <NetworkCosts input={input} frame={frame} />
      <LabelSlots
        labels={[
          [input.modeLabel, 40, 38, 880, 20, 2],
          [`≤ ${input.budgetMinutes} ${minutes}`, 540, 100, 380, 20, 2],
        ]}
      />
    </g>
  );
}
