import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Caption } from "../graphics-common/Caption";
import { CircleNode } from "../graphics-common/CircleNode";
import { DrawPath } from "../graphics-common/DrawPath";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Route } from "../graphics-common/Route";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { TraversalRouteSummary } from "../presets/NodeTraversal/TraversalRouteSummary/TraversalRouteSummary";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { NodeTraversalInput } from "../presets/NodeTraversal/NodeTraversal.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: NodeTraversalInput };
const ROUTE_CUE = 24;
const ROUTE_DRAW_FRAMES = 106;
/**
 * Compositions hold a nested stock graphic on frame 150, so the route is
 * complete by then at any tempo, even where a slow tempo would stretch it
 * further.
 */
const ROUTE_SETTLED_AT = 150;
const EDGE_CUE = 14;
const ROUTE_LINE_CUE = 25;
const CAPTION_CUE = 80;
function _clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}
type KeyedTraversalStep = {
  key: string;
  from: NodeTraversalInput["nodes"][number];
  to: NodeTraversalInput["nodes"][number];
  stepOffset: number;
};

function _buildKeyedEdges(
  edges: NodeTraversalInput["edges"],
  nodes: NodeTraversalInput["nodes"],
): KeyedTraversalStep[] {
  const edgePairCounts = new Map<string, number>();
  return edges.map(([from, to], stepOffset) => {
    const pairKey = `${nodes[from].label}->${nodes[to].label}`;
    const occurrence = edgePairCounts.get(pairKey) ?? 0;
    edgePairCounts.set(pairKey, occurrence + 1);
    return {
      key: `${pairKey}#${occurrence}`,
      from: nodes[from],
      to: nodes[to],
      stepOffset,
    };
  });
}

function _buildKeyedRouteSteps(
  route: NodeTraversalInput["route"],
  nodes: NodeTraversalInput["nodes"],
): KeyedTraversalStep[] {
  const routePairCounts = new Map<string, number>();
  return route.slice(0, -1).map((fromIndex, stepOffset) => {
    const toIndex = route[stepOffset + 1];
    const pairKey = `${nodes[fromIndex].label}->${nodes[toIndex].label}`;
    const occurrence = routePairCounts.get(pairKey) ?? 0;
    routePairCounts.set(pairKey, occurrence + 1);
    return {
      key: `${pairKey}#${occurrence}`,
      from: nodes[fromIndex],
      to: nodes[toIndex],
      stepOffset,
    };
  });
}
/** Draws the bounded authored node-traversal study at an explicit frame. */
export function NodeTraversal({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { nodes, edges, route } = input;
  const progress =
    motion.ramp(
      frame,
      ROUTE_CUE,
      Math.min(motion.scale(ROUTE_DRAW_FRAMES), ROUTE_SETTLED_AT - ROUTE_CUE),
      motion.travel.easing,
    ) *
    (route.length - 1);
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["node-traversal"].directedTraversal,
        })}
      </Eyebrow>
      {input.showRouteLabel ? (
        <TraversalRouteSummary
          label={route
            .map((index) => {
              return nodes[index].label;
            })
            .join(" → ")}
          accent={accent}
        />
      ) : null}
      {_buildKeyedEdges(edges, nodes).map(({ key, from, to, stepOffset }) => {
        return (
          <DrawPath
            key={key}
            d={`M${from.x} ${from.y} L${to.x} ${to.y}`}
            frame={frame}
            at={EDGE_CUE + stepOffset * motion.stagger.edge}
          />
        );
      })}
      {_buildKeyedRouteSteps(route, nodes).map(
        ({ key, from, to, stepOffset }) => {
          return (
            <Route
              key={key}
              from={from}
              to={to}
              progress={_clampUnit(progress - stepOffset)}
              frame={frame}
              at={ROUTE_LINE_CUE}
              color={accent}
            />
          );
        },
      )}
      {nodes.map((node, i) => {
        const routeIndex = route.indexOf(i);
        return (
          <CircleNode
            key={node.label}
            {...node}
            frame={frame}
            index={i}
            accent={routeIndex < 0 ? color.inactive : accent}
            active={routeIndex < 0 ? 0 : _clampUnit(progress - routeIndex + 1)}
            size="lg"
          />
        );
      })}
      <g opacity={motion.ramp(frame, CAPTION_CUE, motion.sheet)}>
        <Caption>
          {getStockDisplayCopyFromDescriptor({
            descriptor:
              LEGACY_DISPLAY_COPY["node-traversal"]
                .aSelectedPathThroughAConnectedSystem,
          })}
        </Caption>
      </g>
    </g>
  );
}
