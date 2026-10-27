import { Text } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { DestinationMarker } from "./DestinationMarker";
import { getTravelCostsFromInput } from "./getTravelCostsFromInput";
import type { Input } from "./TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Stable destination identities tie map markers to their cost ledger. */
export function NetworkDestinations({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {getTravelCostsFromInput(input).map((node, index) => (
        <g
          key={node.id}
          data-shortest-cost={node.cost}
          data-predecessor={node.predecessor ?? ""}
        >
          <DestinationMarker
            node={node}
            index={index}
            input={input}
            frame={frame}
            accent={accent}
          />
          <Text
            x={540}
            y={156 + index * 54}
            size={14}
            fill={node.cost <= input.budgetMinutes ? accent : STOCK.orange}
          >
            {index + 1}·
          </Text>
          <LabelSlots
            labels={[[node.label, 575, 156 + index * 54, 210, 14, 3]]}
          />
          {input.showCosts ? (
            <text
              data-cost-label={node.id}
              x={890}
              y={156 + index * 54}
              fill={STOCK.text}
              textAnchor="end"
              fontSize={16}
            >
              {node.cost}
            </text>
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
