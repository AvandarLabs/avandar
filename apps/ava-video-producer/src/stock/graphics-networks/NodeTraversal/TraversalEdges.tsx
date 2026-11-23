import { DrawPath } from "../../graphics-common/DrawPath";
import { TraversalRouteSummary } from "../../presets/NodeTraversal/TraversalRouteSummary/TraversalRouteSummary";
import { getKeyedEdgesFromNodes } from "./getKeyedEdgesFromNodes";
import { EDGE_CUE } from "./NodeTraversal.constants";
import type { TraversalEdgesData } from "./NodeTraversal.types";
import type { ReactNode } from "react";

type Props = TraversalEdgesData;

/** Renders the traversal edges layer for NodeTraversal. */
export function TraversalEdges(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.input.showRouteLabel ? (
        <TraversalRouteSummary
          label={options.route
            .map((index) => {
              return options.nodes[index].label;
            })
            .join(" → ")}
          accent={options.accent}
        />
      ) : null}
      {getKeyedEdgesFromNodes({
        edges: options.edges,
        nodes: options.nodes,
      }).map(({ key, from, to, stepOffset }) => {
        return (
          <DrawPath
            key={key}
            d={`M${from.x} ${from.y} L${to.x} ${to.y}`}
            frame={options.frame}
            at={EDGE_CUE + stepOffset * options.motion.stagger.edge}
          />
        );
      })}
    </>
  );
}
