import { ramp } from "../../motion";
import {
  Caption,
  CircleNode,
  DrawPath,
  Eyebrow,
  Route,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { TraversalRouteSummary } from "../presets/NodeTraversal/TraversalRouteSummary";
import { useGraphicMotion, useGraphicTokens } from "../theme/useGraphicTheme";
import type { NodeTraversalInput } from "../presets/NodeTraversal/NodeTraversal.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: NodeTraversalInput };

const ROUTE_CUE = 24;
const ROUTE_DRAW_FRAMES = 106;
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
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const { nodes, edges, route } = input;
  const progress =
    ramp(
      frame,
      ROUTE_CUE,
      motion.scale(ROUTE_DRAW_FRAMES),
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
          label={route.map((index) => nodes[index].label).join(" → ")}
          accent={accent}
        />
      ) : null}
      {edges.map(([a, b], i) => (
        <DrawPath
          key={i}
          d={`M${nodes[a].x} ${nodes[a].y} L${nodes[b].x} ${nodes[b].y}`}
          frame={frame}
          at={EDGE_CUE + i * motion.stagger.edge}
        />
      ))}
      {route.slice(0, -1).map((a, i) => (
        <Route
          key={i}
          from={nodes[a]}
          to={nodes[route[i + 1]]}
          progress={_clampUnit(progress - i)}
          frame={frame}
          at={ROUTE_LINE_CUE}
          color={accent}
        />
      ))}
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
      <g opacity={ramp(frame, CAPTION_CUE, motion.sheet)}>
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
