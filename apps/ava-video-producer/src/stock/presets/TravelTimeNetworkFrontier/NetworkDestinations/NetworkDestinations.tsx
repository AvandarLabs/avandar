import { Text } from "../../../graphics-common/Text";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DestinationMarker } from "../DestinationMarker";
import { getTravelCostsFromInput } from "../getTravelCostsFromInput";
import { CostLabel } from "./CostLabel";
import type { Input } from "../TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Stable destination identities tie map markers to their cost ledger. */
export function NetworkDestinations({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {getTravelCostsFromInput(input).map((node, index) => {
        return (
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
              role="value"
              fill={
                node.cost <= input.budgetMinutes
                  ? accent
                  : tokens.color.highlight
              }
            >
              {index + 1}·
            </Text>
            <LabelSlots
              labels={[[node.label, 575, 156 + index * 54, 210, 14, 3]]}
            />
            {input.showCosts ? (
              <CostLabel node={node} index={index} />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}
