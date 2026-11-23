import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { NetworkEdge } from "./NetworkEdge";
import { NetworkHeading } from "./NetworkHeading";
import { NetworkNode } from "./NetworkNode";
import type { Props } from "./NetworkGraph.types";
import type { ReactNode } from "react";

/** Renders NetworkGraph within the authored stock graphics. */
export function NetworkGraph({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "NetworkGraph",
    props: {},
  });
  const { color, layout } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const nodes = input.nodes;
  return (
    <g>
      <NetworkHeading {...{ input, accent, layout }} />
      {input.edges.map(([a, b], i) => {
        return (
          <NetworkEdge
            key={`${a}-${b}-${i}`}
            {...{
              input,
              frame,
              accent,
              style,
              color,
              motion,
              nodes,
              a,
              b,
              i,
            }}
          />
        );
      })}
      {nodes.map((node, i) => {
        return (
          <NetworkNode
            key={node.label}
            {...{ frame, accent, style, node, i }}
          />
        );
      })}
    </g>
  );
}
