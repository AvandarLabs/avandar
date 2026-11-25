import { DrawPath } from "../../graphics-common/DrawPath";
import { Packet } from "../../graphics-common/Packet/Packet";
import {
  HIGHLIGHTED_EDGES,
  EDGE_CUE,
  PACKET_PHASE_STEP,
} from "./NetworkGraph.constants";
import type { NetworkEdgeData } from "./NetworkGraph.types";
import type { ReactNode } from "react";

type Props = NetworkEdgeData;

/** Renders the network edge layer for NetworkGraph. */
export function NetworkEdge(options: Readonly<Props>): ReactNode {
  return (
    <g key={options.i}>
      <DrawPath
        curve={{ from: options.nodes[options.a], to: options.nodes[options.b] }}
        frame={options.frame}
        at={EDGE_CUE + options.i * options.motion.stagger.edge}
        color={
          options.i < HIGHLIGHTED_EDGES ? options.accent : options.color.line
        }
        opacity={
          options.i < HIGHLIGHTED_EDGES
            ? options.style.highlightEdgeAlpha
            : options.style.edgeAlpha
        }
      />
      {options.input.showPackets ? (
        <Packet
          frame={options.frame}
          from={options.nodes[options.a]}
          to={options.nodes[options.b]}
          delay={options.i * PACKET_PHASE_STEP}
          color={options.i % 3 === 0 ? options.color.accentAlt : options.accent}
          size={options.i < HIGHLIGHTED_EDGES ? "md" : "sm"}
        />
      ) : null}
    </g>
  );
}
