import { wave } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { CircleNode } from "../graphics-common/CircleNode";
import { DrawPath } from "../graphics-common/DrawPath";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { GRAPHIC_WIDTH } from "../graphics-common/graphicCanvas.constants";
import { Packet } from "../graphics-common/Packet";
import { Pill } from "../graphics-common/Pill";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { NetworkGraphInput } from "../presets/NetworkGraph/NetworkGraph.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: NetworkGraphInput };

const HIGHLIGHTED_EDGES = 6;
const EDGE_CUE = 22;
const PACKET_PHASE_STEP = 13;
const NODE_PHASE_STEP = 16;
const COUNT_PILL_TOP = 44;
const COUNT_PILL_WIDTH = 113;

/** Draws the bounded authored network-graph study at an explicit frame. */
export function NetworkGraph({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("NetworkGraph", {});
  const { color, layout } = useGraphicTokens();
  const motion = useGraphicMotion();
  const nodes = input.nodes;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["network-graph"].relationshipNetwork,
        })}
      </Eyebrow>
      <Pill
        x={GRAPHIC_WIDTH - layout.graphic.margin - COUNT_PILL_WIDTH}
        y={COUNT_PILL_TOP}
        width={COUNT_PILL_WIDTH}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["network-graph"].nodeCount,
          values: { count: String(input.nodes.length).padStart(2, "0") },
        })}
        color={accent}
      />
      {input.edges.map(([a, b], i) => {
        return (
          <g key={i}>
            <DrawPath
              curve={{ from: nodes[a], to: nodes[b] }}
              frame={frame}
              at={EDGE_CUE + i * motion.stagger.edge}
              color={i < HIGHLIGHTED_EDGES ? accent : color.line}
              opacity={
                i < HIGHLIGHTED_EDGES
                  ? style.highlightEdgeAlpha
                  : style.edgeAlpha
              }
            />
            {input.showPackets ? (
              <Packet
                frame={frame}
                from={nodes[a]}
                to={nodes[b]}
                delay={i * PACKET_PHASE_STEP}
                color={i % 3 === 0 ? color.accentAlt : accent}
                size={i < HIGHLIGHTED_EDGES ? "md" : "sm"}
              />
            ) : null}
          </g>
        );
      })}
      {nodes.map((node, i) => {
        return (
          <CircleNode
            key={node.label}
            {...node}
            frame={frame}
            index={i}
            accent={accent}
            size={i === 0 ? "xl" : "sm"}
            active={
              i === 0
                ? style.hubPulseFloor +
                  wave(frame, style.hubPulsePeriod) * style.hubPulseSwing
                : wave(frame, style.nodePulsePeriod, i * NODE_PHASE_STEP) *
                  style.nodePulseSwing
            }
          />
        );
      })}
    </g>
  );
}
