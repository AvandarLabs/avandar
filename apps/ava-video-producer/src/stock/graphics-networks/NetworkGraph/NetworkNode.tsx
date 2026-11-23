import { Motion } from "../../../motion";
import { CircleNode } from "../../graphics-common/CircleNode/CircleNode";
import { NODE_PHASE_STEP } from "./NetworkGraph.constants";
import type { NetworkNodeData } from "./NetworkGraph.types";
import type { ReactNode } from "react";

type Props = NetworkNodeData;

/** Renders the network node layer for NetworkGraph. */
export function NetworkNode(options: Readonly<Props>): ReactNode {
  return (
    <CircleNode
      key={options.node.label}
      {...options.node}
      frame={options.frame}
      index={options.i}
      accent={options.accent}
      size={options.i === 0 ? "xl" : "sm"}
      active={
        options.i === 0
          ? options.style.hubPulseFloor +
            Motion.wave({
              frame: options.frame,
              period: options.style.hubPulsePeriod,
            }) *
              options.style.hubPulseSwing
          : Motion.wave({
              frame: options.frame,
              period: options.style.nodePulsePeriod,
              offset: options.i * NODE_PHASE_STEP,
            }) * options.style.nodePulseSwing
      }
    />
  );
}
