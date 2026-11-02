import { wave } from "../../motion";
import {
  CircleNode,
  Curve,
  DrawPath,
  Eyebrow,
  Packet,
  Pill,
  STOCK,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { NetworkGraphInput } from "../presets/NetworkGraph/NetworkGraph.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: NetworkGraphInput };

/** Draws the bounded authored network-graph study at an explicit frame. */
export function NetworkGraph({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const nodes = input.nodes;
  const edges = input.edges;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["network-graph"].relationshipNetwork,
        })}
      </Eyebrow>
      <Pill
        x={783}
        y={44}
        width={113}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["network-graph"].nodeCount,
          values: { count: String(input.nodes.length).padStart(2, "0") },
        })}
        color={accent}
      />
      {edges.map(([a, b], i) => (
        <g key={i}>
          <DrawPath
            d={Curve({ from: nodes[a], to: nodes[b] })}
            frame={frame}
            at={22 + i * 2}
            color={i < 6 ? accent : STOCK.line}
            opacity={i < 6 ? 0.34 : 0.65}
          />
          {input.showPackets ? (
            <Packet
              frame={frame}
              from={nodes[a]}
              to={nodes[b]}
              delay={i * 13}
              color={i % 3 === 0 ? STOCK.cyan : accent}
              radius={i < 6 ? 4 : 2.5}
            />
          ) : null}
        </g>
      ))}
      {nodes.map((node, i) => (
        <CircleNode
          key={node.label}
          {...node}
          frame={frame}
          index={i}
          accent={accent}
          radius={i === 0 ? 37 : 25}
          active={
            i === 0
              ? 0.65 + wave(frame, 90) * 0.3
              : wave(frame, 120, i * 16) * 0.5
          }
        />
      ))}
    </g>
  );
}
