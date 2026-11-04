import { DUR, EASE, mix, ramp } from "../../motion";
import {
  CircleNode,
  DrawPath,
  Eyebrow,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { TraversalRouteSummary } from "../presets/NodeTraversal/TraversalRouteSummary";
import type { NodeTraversalInput } from "../presets/NodeTraversal/NodeTraversal.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: NodeTraversalInput };

/** Draws the bounded authored node-traversal study at an explicit frame. */
export function NodeTraversal({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const nodes = input.nodes;
  const edges = input.edges;
  const route = input.route;
  const progress = ramp(frame, 24, 106, EASE.inOut) * (route.length - 1);
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
          at={14 + i * 2}
          width={2}
        />
      ))}
      {route.slice(0, -1).map((a, i) => {
        const b = route[i + 1];
        const t = Math.min(1, Math.max(0, progress - i));
        return (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={mix(t, nodes[a].x, nodes[b].x)}
            y2={mix(t, nodes[a].y, nodes[b].y)}
            stroke={accent}
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={ramp(frame, 25, DUR.chip)}
          />
        );
      })}
      {nodes.map((node, i) => {
        const routeIndex = route.indexOf(i);
        const active =
          routeIndex < 0
            ? 0
            : Math.min(1, Math.max(0, progress - routeIndex + 1));
        return (
          <CircleNode
            key={node.label}
            {...node}
            frame={frame}
            index={i}
            accent={routeIndex < 0 ? STOCK.muted : accent}
            active={active}
            radius={29}
          />
        );
      })}
      <g opacity={ramp(frame, 80, DUR.sheet)}>
        <Text x={480} y={545} size={17} anchor="middle" fill={STOCK.muted}>
          {getStockDisplayCopyFromDescriptor({
            descriptor:
              LEGACY_DISPLAY_COPY["node-traversal"]
                .aSelectedPathThroughAConnectedSystem,
          })}
        </Text>
      </g>
    </g>
  );
}
