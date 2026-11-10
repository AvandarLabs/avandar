import { useId } from "react";
import { DUR, STAGGER, enter, enterAt, mixToken, ramp } from "../motion";
import {
  GRAPH_ITEM_GAP,
  GRAPH_ITEM_PITCH,
  assertFrame,
  edgeHighlight,
  getPacketPositions,
  offsetEdgeEndpoints,
  fitTextLines,
  graphNodeRect,
  nodeHighlight,
  sceneBounds,
  textUnits,
  validateGraph,
} from "./layout/layout";
import { positioned, SceneShell } from "./SceneShell";
import type { GraphNode, GraphSceneProps } from "./scenes.types";

/** Radius of a packet travelling an edge, in pixels. */
const PACKET_RADIUS = 6;
/** Arm length of a `ticks` node's corner ticks, in pixels. */
const TICK_ARM = 18;

/** An editorial graph, with authored placement and directed traversal. */
export function GraphScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  headingReveal,
  nodes,
  edges,
  traversal = [],
  revealAtFrame = 10,
}: GraphSceneProps) {
  validateGraph(nodes, edges, traversal);
  assertFrame(revealAtFrame, "revealAtFrame");
  const bounds = sceneBounds(width, height, Boolean(title || kicker));
  const rects = new Map(
    nodes.map((node) => [node.id, graphNodeRect(node, bounds)]),
  );
  const indices = new Map(nodes.map((node, index) => [node.id, index]));
  const markerId = `arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <SceneShell {...{ frame, width, height, title, kicker, headingReveal }}>
      <svg
        aria-hidden="true"
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--muted-foreground)" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const { start, end } = offsetEdgeEndpoints(
            rects.get(edge.from)!,
            rects.get(edge.to)!,
            edge.offset ?? 0,
          );
          const revealAt =
            revealAtFrame +
            Math.max(indices.get(edge.from)!, indices.get(edge.to)!) * STAGGER +
            DUR.panel;
          const reveal = ramp(frame, revealAt, DUR.sheet);
          const highlight = edgeHighlight(frame, edge, traversal);
          const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
          const labelWidth = edge.label ? textUnits(edge.label) * 18 + 24 : 0;
          return (
            <g key={edge.id} opacity={reveal}>
              <path
                d={path}
                fill="none"
                stroke="var(--border)"
                strokeWidth={3}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - reveal}
                markerEnd={
                  edge.arrow === false ? undefined : `url(#${markerId})`
                }
              />
              <path
                d={path}
                fill="none"
                stroke="var(--brand-strong)"
                strokeWidth={3}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - highlight}
                opacity={highlight > 0 ? 1 : 0}
              />
              {getPacketPositions(frame, edge.packets ?? [], start, end).map(
                (point, index) => (
                  <circle
                    key={`packet-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={PACKET_RADIUS}
                    fill="var(--brand)"
                  />
                ),
              )}
              {edge.label ? (
                <g
                  transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2})`}
                >
                  <rect
                    x={-labelWidth / 2}
                    y={-17}
                    width={labelWidth}
                    height={34}
                    rx={8}
                    fill="var(--ground)"
                  />
                  <text
                    fill="var(--muted-foreground)"
                    fontSize={18}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {edge.label}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      {nodes.map((node, index) => {
        const rect = rects.get(node.id)!;
        const active = nodeHighlight(frame, node.id, traversal);
        const label = fitTextLines(
          [node.label],
          rect.width - 40,
          node.detail ? 70 : 130,
          25,
          19,
        );
        const detail = node.detail
          ? fitTextLines([node.detail], rect.width - 40, 68, 19, 16)
          : null;
        return (
          <article
            key={node.id}
            aria-label={node.label}
            style={{
              ...positioned(rect),
              display: "flex",
              flexDirection: "column",
              padding: 20,
              justifyContent: node.items?.length ? "flex-start" : "center",
              border:
                node.frame === "ticks"
                  ? "none"
                  : `2px solid ${mixToken(active, "var(--border)", "var(--brand-strong)")}`,
              borderRadius: "var(--radius)",
              background:
                node.frame === "ticks"
                  ? "transparent"
                  : mixToken(active, "var(--card)", "var(--brand-soft)"),
              ...enterAt(frame, revealAtFrame, index, { y: 10 }),
            }}
          >
            <div
              style={{
                fontSize: label.fontSize,
                fontWeight: 600,
                lineHeight: 1.22,
                overflowWrap: "anywhere",
              }}
            >
              {label.lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            {detail ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: detail.fontSize,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.22,
                }}
              >
                {detail.lines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            ) : null}
            <_NodeItems
              node={node}
              frame={frame}
              at={revealAtFrame + index * STAGGER + DUR.panel}
            />
            {node.frame === "ticks" ? <_CornerTicks /> : null}
          </article>
        );
      })}
    </SceneShell>
  );
}

/** A node's list items, cascading in one stagger apart under its label. */
function _NodeItems({
  node,
  frame,
  at,
}: {
  node: GraphNode;
  frame: number;
  at: number;
}) {
  if (!node.items?.length) {
    return null;
  }
  return (
    <ul
      style={{
        margin: `${GRAPH_ITEM_GAP}px 0 0`,
        padding: 0,
        listStyle: "none",
      }}
    >
      {node.items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          style={{
            height: GRAPH_ITEM_PITCH,
            fontSize: 19,
            lineHeight: `${GRAPH_ITEM_PITCH}px`,
            color: "var(--muted-foreground)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            ...enter(frame, at + index * STAGGER * 2, { y: 6 }),
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Four L-shaped corner ticks framing a node without a full border. */
function _CornerTicks() {
  const corners = [
    { top: 0, left: 0, borderTop: true, borderLeft: true },
    { top: 0, right: 0, borderTop: true, borderRight: true },
    { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
    { bottom: 0, right: 0, borderBottom: true, borderRight: true },
  ];
  const line = "2px solid var(--border)";
  return (
    <>
      {corners.map(
        (
          { borderTop, borderLeft, borderBottom, borderRight, ...position },
          index,
        ) => (
          <span
            key={index}
            aria-hidden="true"
            style={{
              position: "absolute",
              ...position,
              width: TICK_ARM,
              height: TICK_ARM,
              borderTop: borderTop ? line : undefined,
              borderLeft: borderLeft ? line : undefined,
              borderBottom: borderBottom ? line : undefined,
              borderRight: borderRight ? line : undefined,
            }}
          />
        ),
      )}
    </>
  );
}
