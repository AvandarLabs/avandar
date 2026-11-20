import { useId } from "react";
import { mixToken } from "../../motion";
import { SketchedShape } from "../../stock/primitives/SketchedShape";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme, useVideoTokens } from "../../videoTheme/useVideoTheme";
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
} from "../layout/layout";
import { positioned } from "../positioned";
import { SceneShell } from "../SceneShell";
import { StageTheme } from "../StageTheme/StageTheme";
import { _CornerTicks } from "./_CornerTicks";
import type { VideoMotion } from "../../videoTheme/createVideoMotion/createVideoMotion";
import type { GraphNode, GraphSceneProps } from "../scenes.types";
import type { CSSProperties, ReactNode } from "react";

type NodeItemsOptions = {
  node: GraphNode;
  frame: number;
  at: number;
  motion: VideoMotion;
  color: string;
};
/** Radius of a packet travelling an edge, in pixels. */
const PACKET_RADIUS = 6;
/**
 * An edge's normalised length. Its dash is the whole edge, so the dash
 * offset draws it on.
 */
const EDGE_LENGTH = 1;
/** How far a node rises as it arrives, in pixels. */
const NODE_RISE = 10;
/** How far a node's list item rises as it arrives, in pixels. */
const ITEM_RISE = 6;
/**
 * A node list item's size, set to the fixed item pitch the layout reserves
 * (`GRAPH_ITEM_PITCH`), like a fitted size.
 */
const GRAPH_ITEM_FONT_SIZE = 19;
/**
 * An editorial graph, with authored placement and directed traversal. Edges
 * draw at the emphasis stroke through the theme's shape sketch, node cards
 * take `text.stage.cardTitle`, and traversal lights them in the strong brand
 * colour of the scene palette.
 */
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
}: GraphSceneProps): ReactNode {
  validateGraph(nodes, edges, traversal);
  assertFrame(revealAtFrame, "revealAtFrame");
  const bounds = sceneBounds(width, height, Boolean(title || kicker));
  const rects = new Map(
    nodes.map((node) => {
      return [node.id, graphNodeRect(node, bounds)];
    }),
  );
  const indices = new Map(
    nodes.map((node, index) => {
      return [node.id, index];
    }),
  );
  const markerId = `arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const fontSizes = useVideoTheme().mantine.fontSizes;
  const spacing = useVideoTheme().mantine.spacing;
  const scene = tokens.color.scene;
  const cardTitle = tokens.text.stage.cardTitle;
  const edgeWidth = scales.stroke(tokens.stroke.emphasis);
  const nodeBorderWidth = scales.stroke(tokens.stroke.default);
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
            <path d="M 0 0 L 8 4 L 0 8 z" fill={scene.mutedForeground} />
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
            Math.max(indices.get(edge.from)!, indices.get(edge.to)!) *
              motion.stagger.list +
            motion.panel;
          const reveal = motion.ramp(
            frame,
            revealAt,
            motion.sheet,
            motion.reveal.easing,
          );
          const highlight = edgeHighlight({ frame, edge, traversal, motion });
          const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
          const labelWidth = edge.label ? textUnits(edge.label) * 18 + 24 : 0;
          return (
            <g key={edge.id} opacity={reveal}>
              <SketchedShape
                shape={{ kind: "path", d: path }}
                profile={tokens.sketch.shape}
                fill="none"
                stroke={scene.border}
                strokeWidth={edgeWidth}
                pathLength={EDGE_LENGTH}
                strokeDasharray={EDGE_LENGTH}
                strokeDashoffset={EDGE_LENGTH - reveal}
              />
              {edge.arrow === false ? null : (
                // The arrowhead alone: markers draw without a stroke, scaled
                // by the edge's stroke width.
                <path
                  d={path}
                  fill="none"
                  stroke="none"
                  strokeWidth={edgeWidth}
                  markerEnd={`url(#${markerId})`}
                />
              )}
              <SketchedShape
                shape={{ kind: "path", d: path }}
                profile={tokens.sketch.shape}
                fill="none"
                stroke={scene.brandStrong}
                strokeWidth={edgeWidth}
                pathLength={EDGE_LENGTH}
                strokeDasharray={EDGE_LENGTH}
                strokeDashoffset={EDGE_LENGTH - highlight}
                opacity={highlight > 0 ? 1 : 0}
              />
              {getPacketPositions({
                frame,
                packets: edge.packets ?? [],
                start,
                end,
                motion,
              }).map((point, index) => {
                return (
                  <circle
                    key={`packet-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={PACKET_RADIUS}
                    fill={scene.brand}
                  />
                );
              })}
              {edge.label ? (
                <g
                  transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2})`}
                >
                  <rect
                    x={-labelWidth / 2}
                    y={-17}
                    width={labelWidth}
                    height={34}
                    rx={scales.corner(tokens.corner.cell)}
                    fill={scene.ground}
                  />
                  <text
                    fill={scene.mutedForeground}
                    fontSize={fontSizes.xl}
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
        const active = nodeHighlight({
          frame,
          nodeId: node.id,
          traversal,
          motion,
        });
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
              padding: spacing.xs,
              justifyContent: node.items?.length ? "flex-start" : "center",
              border:
                node.frame === "ticks"
                  ? "none"
                  : `${nodeBorderWidth}px solid ${mixToken(active, scene.border, scene.brandStrong)}`,
              borderRadius: scales.corner(tokens.corner.scene),
              background:
                node.frame === "ticks"
                  ? "transparent"
                  : mixToken(active, scene.card, scene.brandSoft),
              ...motion.enterAt(frame, revealAtFrame, index, { y: NODE_RISE }),
            }}
          >
            <div
              style={{
                fontSize: label.fontSize,
                ...StageTheme.getStageTextStyle({
                  role: cardTitle,
                  fields: ["fontWeight", "lineHeight"],
                }),
                overflowWrap: "anywhere",
              }}
            >
              {label.lines.map((line, i) => {
                return <div key={i}>{line}</div>;
              })}
            </div>
            {detail ? (
              <div
                style={{
                  marginTop: spacing["10"],
                  fontSize: detail.fontSize,
                  color: scene.mutedForeground,
                  lineHeight: cardTitle.lineHeight,
                }}
              >
                {detail.lines.map((line, i) => {
                  return <div key={i}>{line}</div>;
                })}
              </div>
            ) : null}
            <_NodeItems
              node={node}
              frame={frame}
              at={revealAtFrame + index * motion.stagger.list + motion.panel}
              motion={motion}
              color={scene.mutedForeground}
            />
            {node.frame === "ticks" ? (
              <_CornerTicks
                line={`${nodeBorderWidth}px solid ${scene.border}`}
              />
            ) : null}
          </article>
        );
      })}
    </SceneShell>
  );
}
const ITEM_LIST_STYLE: CSSProperties = {
  margin: `${GRAPH_ITEM_GAP}px 0 0`,
  padding: 0,
  listStyle: "none",
};
/** A node's list items, cascading in two list staggers apart under its
 *  label. */
function _NodeItems({ node, frame, at, motion, color }: NodeItemsOptions) {
  if (!node.items?.length) {
    return null;
  }
  return (
    <ul style={ITEM_LIST_STYLE}>
      {node.items.map((item, index) => {
        return (
          <li
            key={`${index}-${item}`}
            style={{
              height: GRAPH_ITEM_PITCH,
              fontSize: GRAPH_ITEM_FONT_SIZE,
              lineHeight: `${GRAPH_ITEM_PITCH}px`,
              color,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              ...motion.enter(frame, at + index * motion.stagger.list * 2, {
                y: ITEM_RISE,
              }),
            }}
          >
            {item}
          </li>
        );
      })}
    </ul>
  );
}
