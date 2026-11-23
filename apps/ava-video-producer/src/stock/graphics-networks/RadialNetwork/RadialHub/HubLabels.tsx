import { Text } from "../../../graphics-common/Text";
import { CENTER } from "../RadialNetwork.constants";
import type { HubLabelsData } from "./RadialHub.types";
import type { ReactNode } from "react";

type Props = HubLabelsData;

/** Renders the hub labels layer for RadialHub. */
export function HubLabels(options: Readonly<Props>): ReactNode {
  return (
    <>
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={options.style.hubGlowRadius}
        fill={options.accent}
        fillOpacity={options.shapes.wash(options.style.hubGlowAlpha)}
      />
      <Text
        role="title"
        x={CENTER.x}
        y={CENTER.y + options.style.hubLabelOffset}
        anchor="middle"
      >
        {options.input.hub.label}
      </Text>
      <Text
        role="detail"
        x={CENTER.x}
        y={CENTER.y + options.style.hubDetailOffset}
        anchor="middle"
      >
        {options.input.hub.detail}
      </Text>
    </>
  );
}
