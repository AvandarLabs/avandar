import { useId } from "react";
import { DUR, STAGGER, enterAt, mixToken, ramp } from "../motion";
import {
  assertFrame,
  edgeEndpoints,
  edgeHighlight,
  fitTextLines,
  graphNodeRect,
  nodeHighlight,
  sceneBounds,
  textUnits,
  validateGraph,
} from "./layout/layout";
import { positioned, SceneShell } from "./SceneShell";
import type { GraphSceneProps } from "./scenes.types";

/** An editorial graph, with authored placement and directed traversal. */
export function GraphScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
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
    <SceneShell {...{ frame, width, height, title, kicker }}>
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
          const { start, end } = edgeEndpoints(
            rects.get(edge.from)!,
            rects.get(edge.to)!,
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
                markerEnd={`url(#${markerId})`}
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
              justifyContent: "center",
              padding: 20,
              border: `2px solid ${mixToken(active, "var(--border)", "var(--brand-strong)")}`,
              borderRadius: "var(--radius)",
              background: mixToken(active, "var(--card)", "var(--brand-soft)"),
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
          </article>
        );
      })}
    </SceneShell>
  );
}
