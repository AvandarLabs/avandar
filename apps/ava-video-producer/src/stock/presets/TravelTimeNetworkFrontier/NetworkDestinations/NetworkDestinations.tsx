import { Text } from "../../../graphics-common/Text";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { DestinationMarker } from "../DestinationMarker";
import { getTravelCostsFromInput } from "../getTravelCostsFromInput";
import { CostLabel } from "./CostLabel";
import { useNetworkDestinationsPresentation } from "./useNetworkDestinationsPresentation";
import type { Input } from "../TravelTimeNetworkFrontier.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Stable destination identities tie map markers to their cost ledger. */
export function NetworkDestinations(props: Readonly<Props>): ReactNode {
  const presentation = useNetworkDestinationsPresentation(props);

  return (
    <g>
      {getTravelCostsFromInput(props.input).map((node, index) => {
        return (
          <g
            key={node.id}
            data-shortest-cost={node.cost}
            data-predecessor={node.predecessor ?? ""}
          >
            <DestinationMarker
              node={node}
              index={index}
              input={props.input}
              frame={props.frame}
              accent={props.accent}
            />
            <Text
              x={540}
              y={156 + index * 54}
              role="value"
              fill={
                node.cost <= props.input.budgetMinutes
                  ? props.accent
                  : presentation.tokens.color.highlight
              }
            >
              {index + 1}·
            </Text>
            <LabelSlots
              labels={[[node.label, 575, 156 + index * 54, 210, 14, 3]]}
            />
            {props.input.showCosts ? (
              <CostLabel node={node} index={index} />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}
