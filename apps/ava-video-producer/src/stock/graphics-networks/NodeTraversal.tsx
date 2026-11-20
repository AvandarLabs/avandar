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
      {edges.map(([a, b], i) => {
        return (
          <DrawPath
            key={i}
            d={`M${nodes[a].x} ${nodes[a].y} L${nodes[b].x} ${nodes[b].y}`}
            frame={frame}
            at={EDGE_CUE + i * motion.stagger.edge}
          />
        );
      })}
      {route.slice(0, -1).map((a, i) => {
        return (
          <Route
            key={i}
            from={nodes[a]}
            to={nodes[route[i + 1]]}
            progress={_clampUnit(progress - i)}
            frame={frame}
            at={ROUTE_LINE_CUE}
            color={accent}
          />
        );
      })}
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
