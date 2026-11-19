import { Text } from "../../graphics-common/Text";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { DestinationMarker } from "./DestinationMarker";
import { getTravelCostsFromInput } from "./getTravelCostsFromInput";
import type { Input } from "./TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";

/** The size of each destination's travel cost. */
const COST_SIZE = 14;
type Props = { input: Input; frame: number; accent: string };
/** Stable destination identities tie map markers to their cost ledger. */
export function NetworkDestinations({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
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
              size={COST_SIZE}
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
              <text
                data-cost-label={node.id}
                x={890}
                y={156 + index * 54}
                fill={tokens.color.text}
                textAnchor="end"
                fontSize={tokens.text.graphic.secondary.fontSize}
                fontFamily={tokens.text.graphic.secondary.fontFamily}
              >
                {node.cost}
              </text>
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}
